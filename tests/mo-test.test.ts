import { join } from 'path';
import { TestRun, runTests } from '../src/testing';

const projectPath = join(__dirname, 'project');

describe('mo-test', () => {
    test('basic usage', async () => {
        const testRuns: TestRun[] = [];
        await runTests(
            {
                directory: projectPath,
            },
            (result) => {
                testRuns.push(result);
            },
        );
        expect(testRuns.length).toEqual(6);
    });

    test('--testmode, wasi', async () => {
        const testRuns: TestRun[] = [];
        await runTests(
            {
                directory: projectPath,
                testModes: ['wasi'],
                testFiles: ['ImportPass'],
            },
            (result) => {
                testRuns.push(result);
            },
        );
        expect(testRuns.length).toEqual(1);
    });

    test('--testfile, basic', async () => {
        const testRuns: TestRun[] = [];
        await runTests(
            {
                directory: projectPath,
                testFiles: ['ImportPass'],
            },
            (result) => {
                testRuns.push(result);
            },
        );
        expect(testRuns.length).toEqual(1);
    });

    test('--testfile, multiple', async () => {
        const testRuns: TestRun[] = [];
        await runTests(
            {
                directory: projectPath,
                testFiles: ['DefaultPass', 'Import'],
            },
            (result) => {
                testRuns.push(result);
            },
        );
        expect(testRuns.length).toEqual(2);
    });

    test('--testfile, empty', async () => {
        const testRuns: TestRun[] = [];
        await runTests(
            {
                directory: projectPath,
                testFiles: ['__nonexistent__'],
            },
            (result) => {
                testRuns.push(result);
            },
        ),
            expect(testRuns.length).toEqual(0);
    });
});
