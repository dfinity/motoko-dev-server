import execa from 'execa';
import glob from 'fast-glob';
import { readFile, stat, unlink } from 'fs/promises';
import { join, relative } from 'path';
import pc from 'picocolors';
import { loadDfxSources } from './dfx';
import { validateSettings } from './settings';

interface TestSettings {
    directory: string;
    verbosity: number;
    testMode: string | undefined;
}

export interface Test {
    path: string;
}

export type TestStatus = 'passed' | 'failed' | 'errored' | 'skipped';

export interface TestState {
    test: Test;
    status: TestStatus;
    message?: string | undefined;
    stdout: string;
    stderr: string;
}

export async function runTests(
    options: Partial<TestSettings>,
    callback?: (result: TestState) => void | Promise<void>,
) {
    const settings = (await validateSettings(options)) as TestSettings;
    const { directory } = settings;

    const paths = await glob('**/*.test.mo', {
        cwd: directory,
        dot: false,
        ignore: ['**/node_modules/**'],
    });

    console.log(
        pc.dim(
            `Found ${paths.length} unit test${paths.length === 1 ? '' : 's'}`,
        ),
    );

    // console.log(cacheLocation); ////

    for (const path of paths) {
        const test = {
            path: join(directory, path),
        };
        const result = await runTest(test, settings);
        if (callback) {
            await callback(result);
        }
    }
}

async function runTest(
    test: Test,
    { directory, verbosity }: TestSettings,
): Promise<TestState> {
    const { path } = test;

    const dfxCache = await findDfxCacheLocation(directory);
    const dfxSources = await loadDfxSources(directory);

    const source = await readFile(path, 'utf8');
    const mode =
        /\/\/[^\S\n]*@testmode[^\S\n]*([a-zA-Z]+)/.exec(source)?.[1] ||
        'interpreter';

    if (verbosity >= 1) {
        console.log(
            pc.blue(`Running test: ${relative(directory, path)} (${mode})`),
        );
    }

    try {
        if (mode === 'interpreter') {
            const interpretResult = await execa(
                join(dfxCache, 'moc'),
                [
                    '-r',
                    path,
                    ...(dfxSources?.split(' ') || []), // TODO: account for spaces in file names
                ],
                { cwd: directory, reject: false },
            );

            return {
                test,
                status: interpretResult.failed ? 'failed' : 'passed',
                stdout: interpretResult.stdout,
                stderr: interpretResult.stderr,
            };
        } else if (mode === 'wasi') {
            const wasmPath = path.replace(/\.[a-z]$/i, '.wasm');
            try {
                const compileResult = await execa(
                    join(dfxCache, 'moc'),
                    ['--wasi-system-api', path],
                    { cwd: directory },
                );
                const wasmtimeResult = await execa('wasmtime', [path], {
                    cwd: directory,
                    reject: false,
                });

                return {
                    test,
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
