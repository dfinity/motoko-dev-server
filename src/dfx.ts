import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

export interface DfxConfig {
    dfx?: string;
    canisters?: CanisterConfig[];
}

export interface CanisterConfig {
    type?: string;
    main?: string;
}

export async function loadDfxConfig(directory: string): Promise<DfxConfig | undefined> {
    const dfxPath = resolve(directory, 'dfx.json');
    if (!existsSync(dfxPath)) {
        return;
    }
    return <DfxConfig>JSON.parse(readFileSync(dfxPath, 'utf8'));
}

export async function 