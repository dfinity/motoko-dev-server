import { readFileSync } from 'fs';
import { spawn } from 'child_process';
import readline from 'readline';
import { Settings } from './settings';
import { DfxConfig, loadDfxConfig } from './dfx';
import { resolve } from 'path';
import chokidar from 'chokidar';
import wasm from './wasm';
import { getDfxCanisters, Canister } from './canister';
import { getVirtualFile } from './utils/motoko';
import pc from 'picocolors';

let canisters: Canister[] | undefined;

export function findCanister(alias: string): Canister | undefined {
    return canisters.find((c) => c.alias === alias);
}

export function watch({ directory, command, verbosity }: Settings) {
    const updateDfxConfig = () => {
        try {
            const dfxConfig = loadDfxConfig(directory);
            if (!dfxConfig) {
                console.error(
                    pc.red('Could not find a `dfx.json` file in directory:'),
                    directory,
                );
                return;
            }
            canisters = getDfxCanisters(directory, dfxConfig);
        } catch (err) {
            console.error(
                pc.red(
                    `Error while loading 'dfx.json' file:\n${
                        err.message || err
                    }`,
                ),
            );
        }
    };
    updateDfxConfig();

    let changeTimeout: ReturnType<typeof setTimeout> | undefined;
    let commandProcess: ReturnType<typeof spawn> | undefined;
    const notifyChange = () => {
        clearTimeout(changeTimeout);
        changeTimeout = setTimeout(() => {
            if (command) {
                if (commandProcess) {
                    commandProcess.kill();
                }
                if (verbosity >= 1) {
                    console.log(pc.blue(`${pc.bold('run')} ${command}`));
                }
                commandProcess = spawn(command, {
                    shell: true,
                    cwd: directory,
                });
                process.stdin.pipe(commandProcess.stdin);
                commandProcess.stdout.pipe(process.stdout);
                commandProcess.stderr.pipe(process.stdout);
                // commandProcess.on('exit', (code) => {
                //     if (verbosity >= 1) {
                //         console.log(
                //             pc.dim('Command exited with code'),
                //             code ? pc.yellow(code) : pc.gray(0),
                //         );
                //     }
                // });
            }
        }, 100);
    };

    const updateCanister = (canister: Canister) => {
        try {
            const source = readFileSync(canister.file, 'utf8');
            wasm.update_canister(canister.file, canister.alias, source);
            const file = getVirtualFile(canister.file);
            file.write(source);
        } catch (err) {
            console.error(
                pc.red(
                    `Error while updating canister '${canister.alias}':\n${
                        err.message || err
                    }`,
                ),
            );
        }
    };

    const removeCanister = (canister: Canister) => {
        try {
            wasm.remove_canister(canister.alias);
            const file = getVirtualFile(canister.file);
            file.delete();
        } catch (err) {
            console.error(
                pc.red(
                    `Error while removing canister '${canister.alias}':\n${
                        err.message || err
                    }`,
                ),
            );
        }
    };

    const dfxWatcher = chokidar
        .watch('./dfx.json', { cwd: directory })
        .on('change', (path) => {
            if (!path.endsWith('dfx.json')) {
                console.warn('Received unexpected `dfx.json` path:', path);
                return;
            }
            notifyChange();
            console.log(pc.green(`${pc.bold('update')} ${path}`));
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

    const moWatcher = chokidar
        .watch('**/*.mo', { cwd: directory })
        .on('all', (event, path) => {
            if (!path.endsWith('.mo')) {
                return;
            }
            if (verbosity >= 2) {
                console.log(pc.green(`${pc.bold(event)} ${path}`));
            }
            notifyChange();
            canisters?.forEach((canister) => {
                if (resolve(directory, path) === canister.file) {
                    if (event === 'unlink') {
                        removeCanister(canister);
                    } else {
                        updateCanister(canister);
                    }
                }
            });
        });

    return {
        dfxJson: dfxWatcher,
        motoko: moWatcher,
    };
}
