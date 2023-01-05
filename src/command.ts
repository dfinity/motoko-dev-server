import { program } from 'commander';
import { resolve } from 'path';
import { Settings, defaultSettings } from './settings';
import devServer from '.';

let verbosity = defaultSettings.verbosity;
const increaseVerbosity = () => verbosity++;

const { port, delay, command } = program
    .argument('[directory]', 'dfx directory')
    .option('-p, --port <port>', `HTTP port (default: ${defaultSettings.port})`)
    .option('-d, --delay', 'artificial delay')
    .option('-c, --command <command>', `run command on file change`)
    .option('-v, --verbose', `increase log level`, increaseVerbosity)
    .parse()
    .opts();

const settings: Settings = {
    directory: resolve(process.cwd(), program.args[0] || '.'),
    port: port ? +port : defaultSettings.port,
    delay: !!delay || defaultSettings.delay,
    command: command || defaultSettings.command,
    verbosity,
};

devServer(settings);
