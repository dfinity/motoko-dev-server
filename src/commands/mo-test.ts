import { program } from 'commander';
import { resolve } from 'path';
import { defaultSettings } from '../settings';
import { TestMode, asTestMode, runTests } from '../testing';

let verbosity = defaultSettings.verbosity;
const increaseVerbosity = () => verbosity++;

const testModes: TestMode[] = [];
const addTestMode = (mode: string) => testModes.push(asTestMode(mode));
const testFiles: string[] = [];
const addTestFile = (file: string) => testFiles.push(file);

const examples: [string, string][] = [
    [
        '--testmode wasi',
        'Use the WASI runtime by default (faster but requires `wasmtime` on your system path)',
    ],
    [
        '--testmode wasi --testmode interpreter',
        'Use both the interpreter and WASI runtimes by default',
    ],
];

const { cwd, version } = program
    .name('mo-test')
    .description(
        `Examples:\n${examples
            .map(
                ([usage, description]) =>
                    `  $ mo-test ${usage}  # ${description}`,
            )
            .join('\n')}`,
    )
    .option('-V, --version', `show installed version`)
    .option('-C, --cwd <cwd>', 'directory containing a `dfx.json` file')
    .option(
        '--testmode <mode>',
        `default test mode (interpreter, wasi)`,
        addTestMode,
    )
    .option(
        '-f, --testfile <file>',
        `only run tests with the given file name prefix`,
        addTestFile,
    )
    .option('-v, --verbose', `show more details in console`, increaseVerbosity)
    .parse()
    .opts();

if (version) {
    console.log('mo-test', require('../../package.json').version);
    process.exit(0);
}

const settings = {
    directory: resolve(cwd || defaultSettings.directory),
    testModes: testModes.length ? testModes : defaultSettings.testModes,
    testFiles: testFiles.length ? testFiles : defaultSettings.testFiles,
    verbosity,
};

runTests(settings)
    .then((runs) => {
        if (
            runs.length === 0 ||
            runs.some(
                (run) => run.status !== 'passed' && run.status !== 'skipped',
            )
        ) {
            process.exit(1);
        }
    })
    .catch((err) => {
        console.error(err.stack || err);
        process.exit(1);
    });
