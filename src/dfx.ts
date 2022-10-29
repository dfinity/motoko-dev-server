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

export function loadDfxConfig(directory: string): DfxConfig | undefined {
    if (!existsSync(directory)) {
        return;
    }
    return <DfxConfig>(
        JSON.parse(readFileSync(resolve(directory, 'dfx.json'), 'utf8'))
    );
}
