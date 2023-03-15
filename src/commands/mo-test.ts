import { program } from 'commander';
import { defaultSettings } from '../settings';
import { TestStatus, runTests } from '../testing';
import { resolve } from 'path';
import pc from 'picocolors';

let verbosity = defaultSettings.verbosity;
const increaseVerbosity = () => verbosity++;

const examples: [string, string][] = [['-C', 'test/']];

const { cwd, version, testMode } = program
    .name('mo-dev')
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
    .option('--testmode', `default test mode (interpreter, wasi)`)
    .option('-v, --verbose', `show more details in console`, increaseVerbosity)
    .parse()
    .opts();

if (version) {
    console.log('mo-test', require('../../package.json').version);
    process.exit(0);
}

const defaultStatusEmoji = '❓';
const statusEmojis: Record<TestStatus, string> = {
    passed: '✅',
    failed: '❌',
    skipped: '⏩',
    errored: '❗',
};

runTests(
    {
        directory: resolve(cwd || defaultSettings.directory),
        testMode: testMode || defaultSettings.testMode,
        verbosity,
    },
    async (result) => {
        console.log(
            pc.dim(
                `${statusEmojis[result.status] ?? defaultStatusEmoji} ${
                    result.test.path
                }`,
            ),
        );
    },
).catch((err) => console.error(err.stack || err));
