import { Settings, defaultSettings, validateSettings } from './settings';
import wasm from './wasm';
import { watch } from './watch';

export { Settings, defaultSettings };

export default async function devServer(options: Partial<Settings> = {}) {
    const settings = await validateSettings(options);

    wasm.update_settings(settings);

    const output = {
        watcher: await watch(settings),
        close() {
            output.watcher.close();
        },
    };
    return output;
}
