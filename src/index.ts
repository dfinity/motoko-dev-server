import { serve } from './server';
import { Settings, defaultSettings } from './settings';
import { watch } from './watch';
import { loadDfxConfig } from './dfx';
import pc from 'picocolors';
import wasm from './wasm';

export { Settings, defaultSettings };

export default async function devServer(options: Partial<Settings> = {}) {
    const settings: Settings = {
        ...defaultSettings,
        ...options,
    };
    wasm.update_settings(settings);

    if (!await loadDfxConfig(settings.directory)) {
        console.error(
            pc.yellow(
                `Please specify a directory containing a \`dfx.json\` config file.`,
            ),
        );
        console.error();
        console.error(pc.bold(`Example:`), '$ mo-dev -c path/to/my/dfx_project');
        console.error();
        process.exit(1);
    }

    const output = {
        watcher: await watch(settings),
        server: settings.hotReload ? serve(settings) : null,
        close() {
            output.watcher.close();
            output.server?.close();
        },
    };
    return output;
}
