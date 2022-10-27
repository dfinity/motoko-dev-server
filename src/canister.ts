import { resolve } from 'path';
import { DfxConfig } from './dfx';

export interface Canister {
    alias: string;
    file: string;
}

export function getDfxCanisters(
    directory: string,
    dfxConfig: DfxConfig,
): Canister[] {
    const canisters: Canister[] = [];
    if (dfxConfig?.canisters) {
        Object.entries(dfxConfig.canisters).forEach(([alias, config]) => {
            if (!config) {
                return;
            }
            const { type, main } = config;
            if (main && (!type || type === 'motoko')) {
                canisters.push({
                    alias,
                    file: resolve(directory, main),
                });
            }
        });
    }
    return canisters;
}
