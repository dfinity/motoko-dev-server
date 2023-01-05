export interface Settings {
    directory: string;
    port: number;
    delay: boolean;
}

export const defaultSettings: Settings = {
    directory: '.',
    port: 7700,
    delay: false,
};
