import { program, Option } from 'commander';
import { resolve } from 'path';
import { Settings, defaultSettings } from './settings';
import devServer from '.';

let verbosity = defaultSettings.verbosity;
const increaseVerbosity = () => verbosity++;

const examples: [string, string][] = [
    ['-r', 'redeploy canisters on file change'],
    ['-d', 'upgrade canisters on file change'],
    ['-g', 'generate TypeScript bindings on file change'],
];

const {
    directory,
    version,
    port,
    delay,
    exec,
    generate,
    deploy,
    reinstall,
    hotReload,
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
    .option('-c, --cwd <directory>', 'directory containing a `dfx.json` file')
    .option('-d, --deploy', `run \`dfx deploy\` on changed canister`)
    .option(
        '-r, --reinstall',
        `reinstall when necessary (may reset canister state)`,
    )
    .option('-g, --generate', `run \`dfx generate\` on changed canister`)
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
            '-p, --port <port>',
            `hot module replacement server port (default: ${defaultSettings.port})`,
        ).hideHelp(),
    )
    .parse()
    .opts();

if (version) {
    console.log('mo-dev', require('../package.json').version);
    process.exit(0);
}

const settings: Settings = {
    directory: resolve(process.cwd(), directory || '.'),
    port: port ? +port : defaultSettings.port,
    delay: !!delay || defaultSettings.delay,
    execute: exec || defaultSettings.execute,
    verbosity,
    generate: !!generate || defaultSettings.generate,
    deploy: !!deploy || defaultSettings.deploy,
    reinstall: !!reinstall || defaultSettings.reinstall,
    hotReload: !!hotReload || defaultSettings.hotReload,
};

devServer(settings);
