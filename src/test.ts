import { Settings } from '../lib/settings';
import glob from 'fast-glob';
import { execa } from 'execa';

export interface TestConfig {
    path: string;
    status: Status | undefined;
}

export interface Test {
    path: string;
}

export type Status = 'started' | 'passed' | 'failed' | 'errored' | 'skipped';

export interface TestStatus {
    test: Test;
    status: Status;
    message: string;
    stdout: string;
    stderr: string;
}

export async function runTests(
    config: TestConfig,
    { directory }: Partial<Settings>,
): Promise<TestStatus[]> {
    const paths = await glob('**/*.test.mo', {
        cwd: directory,
        dot: false,
        ignore: ['**/node_modules/**'],
    });

    console.log(paths); //////

    const cacheLocation = await execa('dfx cache show');

    console.log(cacheLocation); ////

    const results: TestStatus[] = [];
    for (const path of paths) {
    }
    return results;
}
