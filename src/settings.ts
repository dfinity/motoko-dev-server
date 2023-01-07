export interface Settings {
    directory: string;
    port: number;
    delay: boolean;
    execute: string;
    verbosity: number;
    generate: boolean;
    deploy: boolean;
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
    hotReload: false,
};
