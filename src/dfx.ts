import { resolve } from 'path';
import { readFileSync } from 'fs';

export interface DfxConfig {
    dfx?: string;
    canisters?: CanisterConfig[];
}

export interface CanisterConfig {
    type?: string;
    main?: string;
}

export function loadDfxConfig(directory: string): DfxConfig {
    return <DfxConfig>(
        JSON.parse(readFileSync(resolve(directory, 'dfx.json'), 'utf8'))
    );
}
