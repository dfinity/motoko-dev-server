import { program } from 'commander';
import { resolve } from 'path';
import { Settings, defaultSettings } from './settings';
import devServer from '.';

let verbosity = defaultSettings.verbosity;
const increaseVerbosity = () => verbosity++;

const { version, port, delay, exec, generate, deploy, reinstall, hotReload } =
    program
        .argument('[directory]', 'dfx directory')
        .option('-V, --version', `view installed version`)
        .option(
            '-p, --port <port>',
            `HTTP port (default: ${defaultSettings.port})`,
        )
        .option('-x, --exec <exec>', `execute command on file change`)
        .option('-v, --verbose', `increase log level`, increaseVerbosity)
        .option('-g, --generate', `run \`dfx generate\` on changed canister`)
        .option('-d, --deploy', `run \`dfx deploy\` on changed canister`)
        .option(
            '-r, --reinstall',
            `reinstall when necessary (resets canister state)`,
        )
        .option('--hot-reload', `hot module replacement server (experimental)`)
        .parse()
        .opts();

if (version) {
    console.log('mo-dev', require('../package.json').version);
    process.exit(0);
}

const settings: Settings = {
    directory: resolve(process.cwd(), program.args[0] || '.'),
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
