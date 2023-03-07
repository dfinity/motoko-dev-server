export interface Settings {
    directory: string;
    port: number;
    delay: boolean;
    execute: string;
    verbosity: number;
    generate: boolean;
    deploy: boolean;
    test: boolean;
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
    reinstall: false,
    hotReload: false,
};
