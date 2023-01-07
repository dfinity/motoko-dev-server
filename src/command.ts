import { program } from 'commander';
import { resolve } from 'path';
import { Settings, defaultSettings } from './settings';
import devServer from '.';

let verbosity = defaultSettings.verbosity;
const increaseVerbosity = () => verbosity++;

const { port, delay, exec } = program
    .argument('[directory]', 'dfx directory')
    .option('-p, --port <port>', `HTTP port (default: ${defaultSettings.port})`)
    .option('-d, --delay', 'artificial delay')
    .option('-x, --exec <exec>', `execute command on file change`)
    .option('-v, --verbose', `increase log level`, increaseVerbosity)
    .parse()
    .opts();

const settings: Settings = {
    directory: resolve(process.cwd(), program.args[0] || '.'),
    port: port ? +port : defaultSettings.port,
    delay: !!delay || defaultSettings.delay,
    execute: exec || defaultSettings.execute,
    verbosity,
};

devServer(settings);
