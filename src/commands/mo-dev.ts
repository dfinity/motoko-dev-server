import { program, Option } from 'commander';
import { resolve } from 'path';
import { Settings, defaultSettings } from '../settings';
import devServer from '..';
import { TestMode, asTestMode } from '../testing';

let verbosity = defaultSettings.verbosity;
const increaseVerbosity = () => verbosity++;

const testModes: TestMode[] = [];
const addTestMode = (mode: string) => testModes.push(asTestMode(mode));
const testFiles: string[] = [];
const addTestFile = (file: string) => testFiles.push(file);

const examples: [string, string][] = [
    ['-r', 'redeploy canisters on file change'],
    ['-d', 'upgrade canisters on file change'],
    ['-g', 'generate TypeScript bindings on file change'],
    ['-t', 'run unit tests on file change'],
];

const {
    cwd,
    version,
    port,
    delay,
    exec,
    generate,
    deploy,
    test,
    yes,
    hotReload,
    ci,
} = program
    .name('mo-dev')
    .description(
        `Examples:\n${examples
            .map(
                ([usage, description]) =>
                    `  $ mo-dev ${usage}  # ${description}`,
            )
            .join('\n')}`,
    )
    .option('-V, --version', `show installed version`)
    .option('-C, --cwd <cwd>', 'directory containing a `dfx.json` file')
    .option('-d, --deploy', `run \`dfx deploy\` on file change`)
    .option('-t, --test', `run unit tests on file change`)
    .option(
        '--testmode <mode>',
        `default test mode (interpreter, wasi)`,
        addTestMode,
    )
    .option(
        '-f, --testfile <prefix>',
        `only run tests with the given file name prefix`,
        addTestFile,
    )
    .option(
        '-y, --yes',
        `respond "yes" to reinstall prompts (may reset canister state)`,
    )
    .option('-g, --generate', `run \`dfx generate\` on file change`)
    .option('-x, --exec <exec>', `execute command on file change`)
    .option('-v, --verbose', `show more details in console`, increaseVerbosity)
    .addOption(
        new Option(
            '--hot-reload',
            `hot module replacement server (experimental)`,
        ).hideHelp(),
    )
    .addOption(
        new Option(
            '--port <port>',
            `hot module replacement server port (default: ${defaultSettings.port})`,
        ).hideHelp(),
    )
    .parse()
    .opts();

if (version) {
    console.log('mo-dev', require('../../package.json').version);
    process.exit(0);
}

const settings: Settings = {
    directory: resolve(cwd || defaultSettings.directory),
    port: port ? +port : defaultSettings.port,
    delay: !!delay || defaultSettings.delay,
    execute: exec || defaultSettings.execute,
    verbosity,
    generate: !!generate || defaultSettings.generate,
    deploy: !!deploy || defaultSettings.deploy,
    test: !!test || defaultSettings.test,
    testModes: testModes.length ? testModes : defaultSettings.testModes,
    testFiles: testFiles.length ? testFiles : defaultSettings.testModes,
    reinstall: !!yes || defaultSettings.reinstall,
    hotReload: !!hotReload || defaultSettings.hotReload,
    // ci: !!ci || defaultSettings.ci,
    ci: defaultSettings.ci,
};

devServer(settings).catch((err) => {
    console.error(err.stack || err);
    process.exit(1);
});
