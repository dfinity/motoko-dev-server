export interface Settings {
    directory: string;
    port: number;
    delay: boolean;
    command: string;
    verbosity: number;
}

export const defaultSettings: Settings = {
    directory: '.',
    port: 7700,
    delay: false,
    command: '',
    verbosity: 0,
};
