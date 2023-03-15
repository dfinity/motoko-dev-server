import execa from 'execa';
import glob from 'fast-glob';
import { join } from 'path';
import { readFile, stat, unlink } from 'fs/promises';
import { loadDfxConfig } from './dfx';
import pc from 'picocolors';

interface TestSettings {
    directory: string;
    verbosity: number;
    testMode: string | undefined;
}

export interface Test {
    path: string;
}

export type Status = 'passed' | 'failed' | 'errored' | 'skipped';

export interface TestState {
    test: Test;
    status: Status;
    message?: string | undefined;
    // stdout: string;
    // stderr: string;
}

export async function* runTests(settings: TestSettings) {
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
            path,
        };
        yield runTest(test, settings);
    }
}

async function runTest(
    test: Test,
    { directory }: TestSettings,
): Promise<TestState> {
    const { path } = test;

    const dfxCache = await findDfxCacheLocation();

    const source = await readFile(path, 'utf8');
    const mode =
        /\/\/[^\S\n]*@testmode[^\S\n]*([a-zA-Z]+)/.exec(source)?.[1] ||
        'interpreter';

    const dfxConfig = await loadDfxConfig(directory);

    console.log('Running test:', path, `(${mode})`); ////

    if (mode === 'interpreter') {
        const interpretResult = await execa(join(dfxCache, 'moc'), [
            '-r',
            path,
        ]);

        return {
            test,
            status: interpretResult.failed ? 'failed' : 'passed',
        };
    } else if (mode === 'wasi') {
        const wasmPath = path.replace(/\.[a-z]$/i, '.wasm');
        try {
            const compileResult = await execa(join(dfxCache, 'moc'), [
                '--wasi-system-api',
                path,
            ]);
            const wasmtimeResult = await execa('wasmtime', [path]);

            console.log('WASMTIME:', wasmtimeResult); ///

            return {
                test,
                status: wasmtimeResult.failed ? 'failed' : 'passed',
            };
        } catch (err) {
            console.log('ERR:::', err);
            throw err;
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
