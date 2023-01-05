import { serve } from './server';
import { Settings, defaultSettings } from './settings';
import { watch } from './watch';

export default function devServer(settings: Partial<Settings> = {}) {
    const resolvedSettings = {
        ...defaultSettings,
        ...settings,
    };
    return {
        server: serve(resolvedSettings),
        watch: watch(resolvedSettings),
    };
}
