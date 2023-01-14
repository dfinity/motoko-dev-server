import { spawn, spawnSync } from 'child_process';
import chokidar from 'chokidar';
import glob from 'fast-glob';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import pc from 'picocolors';
import { Canister, getDfxCanisters } from './canister';
import { loadDfxConfig } from './dfx';
import { Settings } from './settings';
import { getVirtualFile } from './utils/motoko';
import wasm from './wasm';

// Pattern to watch for file changes
const watchGlob = '**/*.mo';

// Paths to always exclude from the file watcher
const watchIgnore = ['**/node_modules/**/*', '**/.vessel/.tmp/**/*'];

let canisters: Canister[] | undefined;

export function findCanister(alias: string): Canister | undefined {
    return canisters.find((c) => c.alias === alias);
}

export function watch({
    directory,
    execute,
    verbosity,
    generate,
    deploy,
    reinstall,
    hotReload,
}: Settings) {
    const log = (level: number, ...args: any[]) => {
        if (verbosity >= level) {
            const time = new Date().toLocaleTimeString();
            console.log(
                `${pc.dim(time)} ${pc.cyan(pc.bold('[mo-dev]'))}`,
                ...args,
            );
        }
    };

    const loadCanisterIds = (): Record<string, string> | undefined => {
        try {
            const network = 'local';
            const canisterIdsPath = resolve(
                directory,
                '.dfx',
                network,
                'canister_ids.json',
            );
            if (!existsSync(canisterIdsPath)) {
                return;
            }
            log(1, 'Loading canister IDs...');
            const canisterIds: {
                [alias: string]: { [network: string]: string };
            } = JSON.parse(readFileSync(canisterIdsPath, 'utf8'));
            return Object.fromEntries(
                Object.entries(canisterIds)
                    .map(([alias, ids]) => [alias, ids[network]])
                    .filter(([, id]) => id),
            );
        } catch (err) {
            console.error('Error while loading `canister_ids.json`:', err);
        }
    };

    const updateDfxConfig = () => {
        try {
            const dfxConfig = loadDfxConfig(directory);
            if (!dfxConfig) {
                console.error(
                    `${pc.bold(
                        'Could not find a `dfx.json` file in directory:',
                    )} ${directory}`,
                );
                return;
            }
            canisters = getDfxCanisters(directory, dfxConfig);
        } catch (err) {
            console.error(
                `Error while loading 'dfx.json' file:\n${err.message || err}`,
            );
        }

        if (deploy || reinstall) {
            let canisterIds = loadCanisterIds();

            const uiAlias = '__Candid_UI';
            const uiAddress = canisterIds?.[uiAlias];
            if (!uiAddress) {
                // Deploy initial canisters
                canisters.forEach((canister) => {
                    log(0, pc.green('prepare'), pc.gray(canister.alias));
                    spawnSync(
                        'dfx',
                        [
                            'deploy',
                            canister.alias,
                            ...(reinstall ? ['-y'] : []),
                        ],
                        {
                            cwd: directory,
                            stdio: 'inherit',
                            encoding: 'utf-8',
                        },
                    );
                });
            } else if (canisters.length) {
                // Show Candid UI addresses
                canisters.forEach((canister) => {
                    const id = canisterIds[canister.alias];
                    if (id) {
                        log(
                            0,
                            pc.cyan(
                                `${pc.bold(`${canister.alias}`)} → ${pc.white(
                                    `http://127.0.0.1:4943?canisterId=${uiAddress}&id=${id}`,
                                )}`,
                            ),
                        );
                    }
                });
            }
        }
    };
    updateDfxConfig();

    const runCommand = (
        command: string,
        { args, pipe }: { args?: string[]; pipe?: boolean } = {},
    ) => {
        if (verbosity >= 1) {
            console.log(
                pc.magenta(
                    `${pc.bold('run')} ${
                        args
                            ? `${command} [${args
                                  .map((arg) => `'${arg}'`)
                                  .join(', ')}]`
                            : command
                    }`,
                ),
            );
        }
        const commandProcess = spawn(command, args, {
            shell: !args,
            cwd: directory,
        });
        if (pipe) {
            process.stdin.pipe(commandProcess.stdin);
            commandProcess.stdout.pipe(process.stdout);
            commandProcess.stderr.pipe(process.stderr);
        } else {
            commandProcess.on('exit', (code) => {
                if (code) {
                    commandProcess.stdout.pipe(process.stdout);
                    commandProcess.stderr.pipe(process.stderr);
                }
            });
        }
        return commandProcess;
    };

    const finishProcess = async (process: ReturnType<typeof spawn>) => {
        return new Promise((resolve) => process.on('exit', resolve));
    };

    let changeTimeout: ReturnType<typeof setTimeout> | undefined;
    let execProcess: ReturnType<typeof spawn> | undefined;
    const deployProcesses: ReturnType<typeof spawn>[] = [];
    const notifyChange = () => {
        clearTimeout(changeTimeout);
        changeTimeout = setTimeout(() => {
            if (execute) {
                if (execProcess) {
                    execProcess.kill();
                }
                execProcess = runCommand(execute, { pipe: true });
                // commandProcess.on('exit', (code) => {
                //     if (verbosity >= 1) {
                //         console.log(
                //             pc.dim('Command exited with code'),
                //             code ? pc.yellow(code) : pc.gray(0),
                //         );
                //     }
                // });
            }

            // Restart deployment
            deployProcesses.forEach((p) => p.kill());

            // TODO: only run for relevant canisters
            Promise.all(
                canisters.map(async (canister) => {
                    log(0, `${pc.green('update')} ${pc.gray(canister.alias)}`);
                    const pipe = verbosity >= 1;
                    if (generate) {
                        await finishProcess(
                            runCommand('dfx', {
                                args: ['generate', '-q', canister.alias],
                                pipe,
                            }),
                        );
                    }
                    if (deploy) {
                        const process = runCommand('dfx', {
                            args: [
                                'deploy',
                                canister.alias,
                                '-qq',
                                ...(reinstall ? ['-y'] : []),
                            ],
                            // TODO: hide 'Module hash ... is already installed' warnings
                            pipe: pipe || !reinstall,
                        });
                        try {
                            deployProcesses.push(process);
                            await finishProcess(process);
                            if (process?.exitCode === 0) {
                                log(0, pc.gray(`deploy ${canister.alias}`));
                            }
                        } finally {
                            const index = deployProcesses.indexOf(process);
                            if (index !== -1) {
                                deployProcesses.splice(index, 1);
                            }
                        }
                    }
                }),
            );
        }, 100);
    };

    // File source
    const sourceCache = new Map<string, string>();

    // Update a canister on the HMR server
    const updateCanister = (canister: Canister) => {
        try {
            if (hotReload) {
                const source = sourceCache.get(canister.file);
                if (!source) {
                    console.warn('Missing source file for HMR server');
                    return;
                }
                wasm.update_canister(canister.file, canister.alias, source);
                const file = getVirtualFile(canister.file);
                file.write(source);
            }
            return true;
        } catch (err) {
            console.error(
                pc.red(
                    `Error while updating canister '${canister.alias}':\n${
                        err.message || err
                    }`,
                ),
            );
            return false;
        }
    };

    // Remove a canister on the HMR server
    const removeCanister = (canister: Canister) => {
        try {
            sourceCache.delete(canister.file);
            if (hotReload) {
                wasm.remove_canister(canister.alias);
                const file = getVirtualFile(canister.file);
                file.delete();
            }
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

    // console.log(pc.gray('Waiting for Motoko file changes...'));

    const dfxWatcher = chokidar
        .watch('./dfx.json', { cwd: directory, ignored: watchIgnore })
        .on('change', (path) => {
            if (!path.endsWith('dfx.json')) {
                console.warn('Received unexpected `dfx.json` path:', path);
                return;
            }
            notifyChange();
            console.log(pc.blue(`${pc.bold('change')} ${path}`));
            const previousCanisters = canisters;
            updateDfxConfig();
            previousCanisters?.forEach((canister) => {
                if (!canisters?.some((c) => c.alias === canister.alias)) {
                    removeCanister(canister);
                }
            });
            canisters?.forEach((canister) => updateCanister(canister));
        });

    const moWatcher = chokidar
        .watch(watchGlob, { cwd: directory, ignored: watchIgnore })
        .on('all', (event, path) => {
            if (!path.endsWith('.mo')) {
                return;
            }
            if (verbosity >= 1) {
                console.log(pc.blue(`${pc.bold(event)} ${path}`));
            }
            let shouldNotify = true;
            const resolvedPath = resolve(directory, path);
            if (event === 'unlink') {
                sourceCache.delete(resolvedPath);
            } else {
                const source = readFileSync(resolvedPath, 'utf8');
                if (sourceCache.get(resolvedPath) === source) {
                    shouldNotify = false;
                }
                sourceCache.set(resolvedPath, source);
            }
            canisters?.forEach((canister) => {
                if (resolvedPath === canister.file) {
                    if (event === 'unlink') {
                        removeCanister(canister);
                    } else if (!updateCanister(canister)) {
                        shouldNotify = false;
                    }
                }
            });
            if (shouldNotify) {
                notifyChange();
            }
        });

    // Synchronously prepare files
    glob.sync(watchGlob, { cwd: directory, ignore: watchIgnore }).forEach(
        (path) => {
            canisters?.forEach((canister) => {
                if (resolve(directory, path) === canister.file) {
                    updateCanister(canister);
                }
            });
        },
    );

    return {
        dfxJson: dfxWatcher,
        motoko: moWatcher,
        close() {
            dfxWatcher.close();
            moWatcher.close();
        },
    };
}
