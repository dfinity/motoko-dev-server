import execa from 'execa';
import glob from 'fast-glob';
import { join } from 'path';
import { readFile } from 'fs/promises';

interface TestSettings {
    directory: string;
}

export interface Test {
    path: string;
}

export type Status = 'passed' | 'failed' | 'errored' | 'skipped';

export interface TestState {
    test: Test;
    status: Status;
    message: string;
    // stdout: string;
    // stderr: string;
}

export async function runTests({
    directory,
}: TestSettings): Promise<TestState[]> {
    const paths = await glob('**/*.test.mo', {
        cwd: directory,
        dot: false,
        ignore: ['**/node_modules/**'],
    });

    console.log(paths); //////

    const dfxShowResult = await execa('dfx', ['cache', 'show']);
    const cacheLocation = dfxShowResult.stdout;

    // console.log(cacheLocation); ////

    const results: TestState[] = [];
    for (const path of paths) {
        console.log('::', path);

        await runTest({
            path,
        });
    }
    return results;

    async function runTest({ path }: Test): Promise<TestState> {
        const source = await readFile(path, 'utf8');
        const mode =
            /\/\/[^\S\n]*@testmode[^\S\n]*([a-zA-Z]+)/.exec(source)?.[1] ||
            'interpreter';

        console.log('Running test:', path, `(${mode})`);

        if (mode === 'interpreter') {
            // Run tests via moc.js interpreter
            // motoko.setRunStepLimit(100_000_000);
            // const output = motoko.run(virtualPath);
            // return {
            //     passed: output.result
            //         ? !output.result.error
            //         : !output.stderr.includes('error'), // fallback for previous moc.js versions
            //     stdout: output.stdout,
            //     stderr: output.stderr,
            // };

        } else if (mode === 'wasmer') {
            // Run tests via Wasmer
            const start = Date.now();
            const wasiResult = motoko.wasm(virtualPath, 'wasi');
            console.log('Compile time:', Date.now() - start);

            const WebAssembly = (global as any).WebAssembly;
            const module = await (
                WebAssembly.compileStreaming || WebAssembly.compile
            )(wasiResult.wasm);
            await initWASI();
            const wasi = new WASI({});
            await wasi.instantiate(module, {});
            const exitCode = wasi.start();
            const stdout = wasi.getStdoutString();
            const stderr = wasi.getStderrString();
            wasi.free();
            if (exitCode !== 0) {
                console.log(stdout);
                console.error(stderr);
                console.log('Exit code:', exitCode);
            }
            return {
                passed: exitCode === 0,
                stdout,
                stderr,
            };
        } else {
            throw new Error(`Invalid test mode: '${mode}'`);
        }

        const compileResult = await execa(join(cacheLocation, 'moc'), [
            '--wasi-system-api',
            path,
        ]);

        return {
            status: 'passed',
        };
    }
}
