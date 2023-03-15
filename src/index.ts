import { serve } from './server';
import { Settings, defaultSettings, validateSettings } from './settings';
import { watch } from './watch';
import { loadDfxConfig } from './dfx';
import pc from 'picocolors';
import wasm from './wasm';

export { Settings, defaultSettings };

export default async function devServer(options: Partial<Settings> = {}) {
    const settings = await validateSettings(options);

    wasm.update_settings(settings);

    const output = {
        watcher: await watch(settings),
        server: settings.hotReload ? await serve(settings) : null,
        close() {
            output.watcher.close();
            output.server?.close();
        },
    };
    return output;
}
