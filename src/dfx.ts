import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import execa from 'execa';

export interface DfxConfig {
    dfx?: string;
    canisters?: CanisterConfig[];
    defaults?: {
        build?: {
            packtool?: string;
        };
    };
}

export interface CanisterConfig {
    type?: string;
    main?: string;
}

export async function findDfxConfig(
    directory: string,
): Promise<DfxConfig | undefined> {
    const dfxPath = resolve(directory, 'dfx.json');
    if (!existsSync(dfxPath)) {
        return;
    }
    return <DfxConfig>JSON.parse(readFileSync(dfxPath, 'utf8'));
}

export async function findDfxSources(
    directory: string,
): Promise<string | undefined> {
    const dfxConfig = await findDfxConfig(directory);
    const packtool = dfxConfig?.defaults?.build?.packtool;
    if (!packtool) {
        return;
    }
    const packtoolResult = await execa(packtool);
    if (packtoolResult.failed) {
        throw new Error(
            `Error while running 'defaults.build.packtool' command from dfx.json file in ${directory}`,
        );
    }
    return packtoolResult.stdout;
}
