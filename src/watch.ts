import { readFileSync } from 'fs';
import { DfxConfig, loadDfxConfig } from './dfx';
import { resolve } from 'path';
import chokidar from 'chokidar';
import wasm from './wasm';
import { getDfxCanisters, Canister } from './canister';

export function watch(directory: string) {
    // let dfxConfig: DfxConfig | undefined;
    let canisters: Canister[] | undefined;

    const updateDfxConfig = () => {
        const dfxConfig = loadDfxConfig(directory);
        canisters = getDfxCanisters(directory, dfxConfig);
    };
    updateDfxConfig();

    const updateCanister = (canister: Canister) => {
        wasm.update_canister(
            canister.alias,
            readFileSync(canister.file, 'utf8'),
        );
    };

    const removeCanister = (canister: Canister) => {
        wasm.remove_canister(canister.alias);
    };

    chokidar.watch('./dfx.json', { cwd: directory }).on('change', (path) => {
        if (!path.endsWith('dfx.json')) {
            console.warn('Received unexpected `dfx.json` path:', path);
            return;
        }
        console.log('Updating', path);
        const previousCanisters = canisters;
        updateDfxConfig();
        previousCanisters?.forEach((canister) => {
            if (!canisters.some((c) => c.alias === canister.alias)) {
                removeCanister(canister);
            }
        });
        canisters?.forEach((canister) => {
            updateCanister(canister);
        });
    });

    chokidar.watch('**/*.mo', { cwd: directory }).on('all', (event, path) => {
        if (!path.endsWith('.mo')) {
            return;
        }
        console.log(event, path);
        canisters.forEach((canister) => {
            if (resolve(directory, path) === canister.file) {
                if (path === 'unlink') {
                    removeCanister(canister);
                } else {
                    updateCanister(canister);
                }
            }
        });
    });
}
