import { serve } from './server';
import { Settings, defaultSettings } from './settings';
import { watch } from './watch';
import { loadDfxConfig } from './dfx';
import pc from 'picocolors';
import wasm from './wasm';

export default function devServer(options: Partial<Settings> = {}) {
    const settings: Settings = {
        ...defaultSettings,
        ...options,
    };
    wasm.update_settings(settings);

    if (!loadDfxConfig(settings.directory)) {
        console.error(
            pc.yellow(
                `Please specify a directory containing a \`dfx.json\` config file.`,
            ),
        );
        console.error();
        console.error(pc.bold(`example:`), '$ mo-dev ./path/to/my/project');
        console.error();
        process.exit(1);
    }

    return {
        server: serve(settings),
        watch: watch(settings),
    };
}
