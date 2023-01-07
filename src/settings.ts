export interface Settings {
    directory: string;
    port: number;
    delay: boolean;
    execute: string;
    verbosity: number;
}

export const defaultSettings: Settings = {
    directory: '.',
    port: 7700,
    delay: false,
    execute: '',
    verbosity: 0,
};
