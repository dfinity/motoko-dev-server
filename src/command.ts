import { program } from 'commander';
import { resolve } from 'path';
import { serve } from './server';
import { Settings, defaultSettings } from './settings';
import { watch } from './watch';

const { port, delay } = program
    .argument('[directory]', 'dfx directory')
    .option('-p, --port', `HTTP port (default: ${defaultSettings.port})`)
    .option('-d, --delay', 'artificial delay')
    .parse()
    .opts();

const settings: Settings = {
    ...defaultSettings,
    directory: resolve(process.cwd(), program.args[0] || '.'),
};

serve(settings);
watch(settings);
