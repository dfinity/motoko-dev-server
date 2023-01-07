import { program } from 'commander';
import { resolve } from 'path';
import { Settings, defaultSettings } from './settings';
import devServer from '.';

let verbosity = defaultSettings.verbosity;
const increaseVerbosity = () => verbosity++;

const { port, delay, exec, generate, deploy, live } = program
    .argument('[directory]', 'dfx directory')
    .option('-p, --port <port>', `HTTP port (default: ${defaultSettings.port})`)
    // .option('-a, --artificial-delay', 'artificial delay')
    .option('-x, --exec <exec>', `execute command on file change`)
    .option('-v, --verbose', `increase log level`, increaseVerbosity)
    .option('-g, --generate', `run \`dfx generate\` on changed canister`)
    .option('-d, --deploy', `run \`dfx deploy\` on changed canister`)
    .option('-l, --live', `use Motoko VM for live reloading (experimental)`)
    .parse()
    .opts();

console.log('LIVE:', live);////

const settings: Settings = {
    directory: resolve(process.cwd(), program.args[0] || '.'),
    port: port ? +port : defaultSettings.port,
    delay: !!delay || defaultSettings.delay,
    execute: exec || defaultSettings.execute,
    verbosity,
    generate: !!generate || defaultSettings.generate,
    deploy: !!deploy || defaultSettings.deploy,
    live: !!live || defaultSettings.live,
};

devServer(settings);
