import { program } from 'commander';
import { createServer } from 'http';
import { resolve } from 'path';
import createApp from './app';
import { Settings } from './settings';
import { watch } from './watch';

const defaultPort = 7700;

const { port, delay } = program
    .argument('[directory]', 'dfx directory')
    .option('-p, --port', `HTTP port (default: ${defaultPort})`)
    .option('-d, --delay', 'artificial delay')
    .parse()
    .opts();

const settings: Settings = {
    directory: resolve(process.cwd(), program.args[0] || '.'),
    delay,
};

if (delay) {
    console.log('Adding artificial delay');
}

const devServerPort = +process.env.PORT || port || defaultPort;

const app = createApp(settings);
const server = createServer(app);

server.listen(devServerPort);
console.log('Listening on port', devServerPort);

watch(settings);
