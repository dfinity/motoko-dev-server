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
        try {
            const dfxConfig = loadDfxConfig(directory);
            if (!dfxConfig) {
                console.error(
                    'Could not find a `dfx.json` file in directory:',
                    directory,
                );
                return;
            }
            canisters = getDfxCanisters(directory, dfxConfig);
        } catch (err) {
            console.error('Error while loading `dfx.json` file:', err);
        }
    };
    updateDfxConfig();

    const updateCanister = (canister: Canister) => {
        try {
            wasm.update_canister(
                canister.alias,
                readFileSync(canister.file, 'utf8'),
            );
        } catch (err) {
            console.error(
                `Error while updating canister '${canister.alias}':`,
                err,
            );
        }
    };

    const removeCanister = (canister: Canister) => {
        try {
            wasm.remove_canister(canister.alias);
        } catch (err) {
            console.error(
                `Error while removing canister '${canister.alias}':`,
                err,
            );
        }
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
            if (!canisters?.some((c) => c.alias === canister.alias)) {
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
        canisters?.forEach((canister) => {
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
