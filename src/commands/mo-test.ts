import { program } from 'commander';
import { defaultSettings } from '../settings';
import { TestStatus, runTests, TestMode, asTestMode } from '../testing';
import { resolve, relative } from 'path';
import pc from 'picocolors';

let verbosity = defaultSettings.verbosity;
const increaseVerbosity = () => verbosity++;

const testModes: TestMode[] = [];
const addTestMode = (mode: string) => testModes.push(asTestMode(mode));

const examples: [string, string][] = [['-C', 'test/']];

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

const settings = {
    directory: resolve(cwd || defaultSettings.directory),
    testModes: testModes.length ? testModes : defaultSettings.testModes,
    verbosity,
};

runTests(settings, async (run) => {
    const important = run.status === 'errored' || run.status === 'failed';
    if (important) {
        if (run.stdout?.trim()) {
            console.error(run.stdout);
        }
        if (run.stderr?.trim()) {
            console.error(pc.red(run.stderr));
        }
    }
    const showTestMode =
        settings.testModes.length > 1 || !settings.testModes.includes(run.mode);
    const decorateExtension = '.test.mo';
    const decoratedPath = run.test.path.endsWith(decorateExtension)
        ? `${run.test.path.slice(0, -decorateExtension.length)}`
        : run.test.path;
    console.log(
        pc.white(
            `${statusEmojis[run.status] ?? defaultStatusEmoji} ${relative(
                settings.directory,
                decoratedPath,
            )}${showTestMode ? pc.dim(` (${run.mode})`) : ''}`,
        ),
    );
}).catch((err) => console.error(err.stack || err));
