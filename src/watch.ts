import { readFileSync } from 'fs';
import { DfxConfig, loadDfxConfig } from './dfx';
import { resolve } from 'path';
import chokidar from 'chokidar';
import wasm from './wasm';
import { getDfxCanisters, Canister } from './canister';

export function watch(directory: string) {
    let dfxConfig: DfxConfig | undefined;
    let canisters: Canister[] | undefined;

    const updateDfxConfig = () => {
        dfxConfig = loadDfxConfig(directory);
        canisters = getDfxCanisters(dfxConfig);
    };
    updateDfxConfig();

    const updateCanister = (canister: Canister) => {
        wasm.update_canister(
            canister.alias,
            readFileSync(canister.file, 'utf8'),
        );
    };

    chokidar
        .watch(resolve(directory, 'dfx.json'))
        .on('change', (event, path) => {
            updateDfxConfig();

            canisters?.forEach((canister) => {});
        });

    chokidar
        .watch(resolve(directory, '**/*.mo'))
        .on('add change unlink', (event, path) => {
            if (path.endsWith('.mo')) {
                console.log(event, path);
                canisters.forEach((canister) => {
                    if (resolve(directory, path) === resolve(canister.file)) {
                        if (path === 'unlink') {
                            wasm.remove_canister(canister.alias);
                        } else {
                            updateCanister(canister);
                        }
                    }
                });
            } else if (path.endsWith('dfx.json')) {
            }
        });
}
