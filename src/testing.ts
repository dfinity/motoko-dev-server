import execa from 'execa';
import glob from 'fast-glob';
import { existsSync, unlinkSync } from 'fs';
import { readFile } from 'fs/promises';
import onCleanup from 'node-cleanup';
import { basename, dirname, join, relative } from 'path';
import pc from 'picocolors';
import shellEscape from 'shell-escape';
import { loadDfxSources } from './dfx';
import { validateSettings } from './settings';

export interface TestSettings {
    directory: string;
    verbosity: number;
    testModes: TestMode[];
    testFiles: string[];
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
    // TODO: possibly validate here
    return mode as TestMode;
}

export async function runTests(
    options: Partial<TestSettings>,
    callback?: (result: TestRun) => void | Promise<void>,
) {
    const settings = (await validateSettings(options)) as TestSettings;
    const { directory } = settings;

    const testFilePattern = '*.test.mo';
    const paths = (
        await glob(`**/${testFilePattern}`, {
            cwd: directory,
            dot: false,
            ignore: ['**/node_modules/**'],
        })
    ).filter((path) => {
        const filename = basename(path);
        return (
            !settings.testFiles.length ||
            settings.testFiles.some((f) => filename.startsWith(f))
        );
    });

    const mocPath = await findMocPath(settings);
    const dfxSources = await loadDfxSources(directory);

    if (settings.verbosity >= 1) {
        console.log(pc.magenta(dfxSources ?? '(no package sources)'));
    }

    if (settings.verbosity >= 0) {
        console.log(
            `Running ${paths.length} unit test file${
                paths.length === 1 ? '' : 's'
            } ${pc.dim(
                `(${
                    settings.testFiles.length
                        ? settings.testFiles.map((f) => `${f}*`).join(', ')
                        : testFilePattern
                })`,
            )}\n`,
        );
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
            mocPath,
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
                        console.error(pc.bold(pc.red(run.stderr)));
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

interface SharedTestInfo {
    mocPath: string;
    dfxSources: string | undefined;
}

async function runTestFile(
    test: Test,
    settings: TestSettings,
    shared: SharedTestInfo,
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
    { mocPath, dfxSources }: SharedTestInfo,
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
                `${shellEscape([mocPath, '-r', path])}${
                    dfxSources ? ` ${dfxSources}` : ''
                }`,
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
            const cleanup = () => {
                if (existsSync(wasmPath)) {
                    unlinkSync(wasmPath);
                }
            };
            cleanupHandlers.add(cleanup);
            try {
                await execa(
                    `${shellEscape([
                        mocPath,
                        '-wasi-system-api',
                        '-o',
                        wasmPath,
                        path,
                    ])}${dfxSources ? ` ${dfxSources}` : ''}`,
                    { shell: true, cwd: settings.directory },
                );
                const wasmtimeResult = await execa(
                    'wasmtime',
                    [
                        basename(wasmPath),
                        '--enable-cranelift-nan-canonicalization',
                        '--wasm-features',
                        'multi-memory,bulk-memory',
                    ],
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
                cleanup();
                cleanupHandlers.delete(cleanup);
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
        cacheLocation = (
            await execa('dfx', ['cache', 'show'], {
                cwd: directory,
            })
        ).stdout;
        dfxCacheLocationMap.set(directory, cacheLocation);
    }
    return cacheLocation;
}

async function findMocPath(settings: TestSettings): Promise<string> {
    const mocCommand = 'moc';
    return (
        // (await which(mocCommand, { nothrow: true })) ||
        process.env.MOC_BINARY ||
        join(await findDfxCacheLocation(settings.directory), mocCommand)
    );
}

type CleanupHandler = (
    exitCode: number | null,
    signal: string | null,
) => boolean | undefined | void;

const cleanupHandlers = new Set<CleanupHandler>();
onCleanup((...args) => {
    for (const handler of cleanupHandlers) {
        handler(...args);
    }
});
