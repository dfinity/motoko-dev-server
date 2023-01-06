import { serve } from './server';
import { Settings, defaultSettings } from './settings';
import { watch } from './watch';
import { loadDfxConfig } from './dfx';
import pc from 'picocolors';

export default function devServer(settings: Partial<Settings> = {}) {
    const resolvedSettings = {
        ...defaultSettings,
        ...settings,
    };

    if (!loadDfxConfig(settings.directory)) {
        console.error(
            pc.yellow(
                `Please specify a directory containing a \`dfx.json\` config file.`,
            ),
        );
        console.error();
        console.error(
            pc.bold(`example:`),
            '$ mo-dev ./path/to/my/project',
        );
        console.error();
        process.exit(1);
    }

    return {
        server: serve(resolvedSettings),
        watch: watch(resolvedSettings),
    };
}
