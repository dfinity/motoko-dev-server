import { program } from 'commander';
import { resolve } from 'path';
import { serve } from './server';
import { Settings, defaultSettings } from './settings';
import { watch } from './watch';

const { port, delay } = program
    .argument('[directory]', 'dfx directory')
    .option('-p, --port <port>', `HTTP port (default: ${defaultSettings.port})`)
    .option('-d, --delay', 'artificial delay')
    .parse()
    .opts();

const settings: Settings = {
    directory: resolve(process.cwd(), program.args[0] || '.'),
    port: port ? +port : defaultSettings.port,
    delay: !!delay || defaultSettings.delay,
};

serve(settings);
watch(settings);
