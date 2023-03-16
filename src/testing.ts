import execa from 'execa';
import glob from 'fast-glob';
import { readFile, stat, unlink } from 'fs/promises';
import { join, relative, basename, dirname } from 'path';
import pc from 'picocolors';
import { loadDfxSources } from './dfx';
import { validateSettings } from './settings';
import shellEscape from 'shell-escape';

const testFilePattern = '*.test.mo';

export interface TestSettings {
    directory: string;
    verbosity: number;
    testModes: TestMode[];
}

export interface Test {
    path: string;
}

export type TestMode = 'interpreter' | 'wasi';
export type TestStatus = 'passed' | 'failed' | 'errored' | 'skipped';

export interface TestRun {
    test: Test;
    mode: TestMode;
    status: TestStatus;
    message?: string | undefined;
    stdout: string;
    stderr: string;
}

export function asTestMode(mode: string): TestMode {
    // TODO: possibly validate
    return mode as TestMode;
}

export async function runTests(
    options: Partial<TestSettings>,
    callback?: (result: TestRun) => void | Promise<void>,
) {
    const settings = (await validateSettings(options)) as TestSettings;
    const { directory } = settings;

    const paths = await glob(`**/${testFilePattern}`, {
        cwd: directory,
        dot: false,
        ignore: ['**/node_modules/**'],
    });

    const dfxCache = await findDfxCacheLocation(directory);
    const dfxSources = await loadDfxSources(directory);

    if (settings.verbosity >= 1) {
        console.log(pc.magenta(dfxSources));
    }

    if (settings.verbosity >= 0) {
        console.log(
            `Running ${paths.length} unit test file${
                paths.length === 1 ? '' : 's'
            } ${pc.dim(`(${testFilePattern})`)}`,
        );
        console.log();
    }

    const defaultStatusEmoji = '❓';
    const statusEmojis: Record<TestStatus, string> = {
        passed: '✅',
        failed: '❌',
        skipped: '⏩',
        errored: '❗',
    };

    const runs: TestRun[] = [];
    for (const path of paths) {
        const test = {
            path: join(directory, path),
        };
        const fileRuns = await runTestFile(test, settings, {
            dfxCache,
            dfxSources,
        });
        for (const run of fileRuns) {
            runs.push(run);
            if (callback) {
                await callback(run);
            }
            if (settings.verbosity >= 0) {
                const important =
                    run.status === 'errored' || run.status === 'failed';
                if (important) {
                    if (run.stdout?.trim()) {
                        console.error(run.stdout);
                    }
                    if (run.stderr?.trim()) {
                        console.error(pc.red(run.stderr));
                    }
                }
                const showTestMode =
                    settings.testModes.length > 1 ||
                    !settings.testModes.includes(run.mode);
                const decorateExtension = '.test.mo';
                const decoratedPath = run.test.path.endsWith(decorateExtension)
                    ? `${run.test.path.slice(0, -decorateExtension.length)}`
                    : run.test.path;
                console.log(
                    pc.white(
                        `${
                            statusEmojis[run.status] ?? defaultStatusEmoji
                        } ${relative(settings.directory, decoratedPath)}${
                            showTestMode ? pc.dim(` (${run.mode})`) : ''
                        }`,
                    ),
                );
            }
        }
    }

    if (runs.length && settings.verbosity >= 0) {
        const counts = {} as Record<TestStatus, number>;
        runs.forEach(
            (run) => (counts[run.status] = (counts[run.status] || 0) + 1),
        );
        console.log();
        console.log(
            (<TestStatus[]>['passed', 'failed', 'errored', 'skipped'])
                .filter((s) => s in counts)
                .map((s) => `${counts[s]} ${s}`)
                .concat([`${runs.length} total`])
                .join(', '),
        );
        console.log();
    }
    return runs;
}

async function runTestFile(
    test: Test,
    settings: TestSettings,
    shared: { dfxCache: string; dfxSources: string },
): Promise<TestRun[]> {
    const source = await readFile(test.path, 'utf8');
    const modes: TestMode[] = [];
    const modeRegex = /\/\/[^\S\n]*@testmode[^\S\n]*([a-zA-Z]+)/g;
    let nextMode: string;
    while ((nextMode = modeRegex.exec(source)?.[1])) {
        modes.push(asTestMode(nextMode));
    }
    if (!modes.length) {
        modes.push(...settings.testModes);
    }

    const runs: TestRun[] = [];
    for (const mode of modes) {
        runs.push(await runTest(test, mode, settings, shared));
    }
    return runs;
}

async function runTest(
    test: Test,
    mode: TestMode,
    settings: TestSettings,
    { dfxCache, dfxSources }: { dfxCache: string; dfxSources: string },
): Promise<TestRun> {
    const { path } = test;

    if (settings.verbosity >= 1) {
        console.log(
            pc.blue(
                `Running test: ${relative(
                    settings.directory,
                    test.path,
                )} (${mode})`,
            ),
        );
    }

    try {
        if (mode === 'interpreter') {
            const interpretResult = await execa(
                `${shellEscape([
                    join(dfxCache, 'moc'),
                    '-r',
                    path,
                ])} ${dfxSources}`,
                { shell: true, cwd: settings.directory, reject: false },
            );
            return {
                test,
                mode,
                status: interpretResult.failed ? 'failed' : 'passed',
                stdout: interpretResult.stdout,
                stderr: interpretResult.stderr,
            };
        } else if (mode === 'wasi') {
            const wasmPath = `${path.replace(/\.mo$/i, '')}.wasm`;

            try {
                await execa(
                    `${shellEscape([
                        join(dfxCache, 'moc'),
                        '-wasi-system-api',
                        '-o',
                        wasmPath,
                        path,
                    ])} ${dfxSources}`,
                    { shell: true, cwd: settings.directory },
                );
                const wasmtimeResult = await execa(
                    'wasmtime',
                    [basename(wasmPath)],
                    {
                        cwd: dirname(path),
                        reject: false,
                    },
                );
                return {
                    test,
                    mode,
                    status: wasmtimeResult.failed ? 'failed' : 'passed',
                    stdout: wasmtimeResult.stdout,
                    stderr: wasmtimeResult.stderr,
                };
            } finally {
                if ((await stat(wasmPath)).isFile()) {
                    await unlink(wasmPath);
                }
            }
        } else {
            throw new Error(`Invalid test mode: '${mode}'`);
        }
    } catch (err) {
        return {
            test,
            mode,
            status: 'errored',
            stdout: err.stdout,
            stderr: err.stderr || String(err.stack || err),
        };
    }
}

const dfxCacheLocationMap = new Map<string, string>();
async function findDfxCacheLocation(directory: string): Promise<string> {
    let cacheLocation = dfxCacheLocationMap.get(directory);
    if (!cacheLocation) {
        const result = await execa('dfx', ['cache', 'show'], {
            cwd: directory,
        });
        cacheLocation = result.stdout;
        dfxCacheLocationMap.set(directory, cacheLocation);
    }
    return cacheLocation;
}
