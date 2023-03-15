import pc from 'picocolors';
import { loadDfxConfig } from './dfx';
import { TestMode } from './testing';

export interface Settings {
    directory: string;
    port: number;
    delay: boolean;
    execute: string;
    verbosity: number;
    generate: boolean;
    deploy: boolean;
    test: boolean;
    testModes: TestMode[];
    reinstall: boolean;
    hotReload: boolean;
}

export const defaultSettings: Settings = {
    directory: '.',
    port: 7700,
    delay: false,
    execute: '',
    verbosity: 0,
    generate: false,
    deploy: false,
    test: false,
    testModes: ['interpreter'],
    reinstall: false,
    hotReload: false,
};

export async function validateSettings(
    settings: Partial<Settings>,
): Promise<Settings> {
    const resolvedSettings: Settings = {
        ...defaultSettings,
        ...settings,
    };
    if (!(await loadDfxConfig(resolvedSettings.directory))) {
        console.error(
            pc.yellow(
                `Please specify a directory containing a \`dfx.json\` config file.`,
            ),
        );
        console.error();
        console.error(
            pc.bold(`Example:`),
            '$ mo-dev -c path/to/my/dfx_project',
        );
        console.error();
        process.exit(1);
    }
    return resolvedSettings;
}
