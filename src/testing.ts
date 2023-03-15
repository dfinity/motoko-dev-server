import execa from 'execa';
import glob from 'fast-glob';
import { join } from 'path';
import { readFile, stat, unlink } from 'fs/promises';
import { findDfxConfig, findDfxSources } from './dfx';
import pc from 'picocolors';
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

    const dfxCache = await findDfxCacheLocation();
    const sources = await findDfxSources(directory);

    const source = await readFile(path, 'utf8');
    const mode =
        /\/\/[^\S\n]*@testmode[^\S\n]*([a-zA-Z]+)/.exec(source)?.[1] ||
        'interpreter';

    const dfxConfig = await findDfxConfig(directory);

    if (verbosity >= 1) {
        console.log(pc.blue(`Running test: ${path} (${mode})`)); ////
    }

    if (mode === 'interpreter') {
        const interpretResult = await execa(join(dfxCache, 'moc'), [
            '-r',
            path,
            ...(sources?.split(' ') || []), // TODO: account for spaces in file names
        ]);

        return {
            test,
            status: interpretResult.failed ? 'failed' : 'passed',
            stdout: interpretResult.stdout,
            stderr: interpretResult.stderr,
        };
    } else if (mode === 'wasi') {
        const wasmPath = path.replace(/\.[a-z]$/i, '.wasm');
        try {
            const compileResult = await execa(join(dfxCache, 'moc'), [
                '--wasi-system-api',
                path,
            ]);
            const wasmtimeResult = await execa('wasmtime', [path]);

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
}

let dfxCacheLocation: string | undefined;
async function findDfxCacheLocation(): Promise<string> {
    if (!dfxCacheLocation) {
        const result = await execa('dfx', ['cache', 'show']);
        dfxCacheLocation = result.stdout;
    }
    return dfxCacheLocation;
}
