import { spawn, spawnSync } from 'child_process';
import chokidar from 'chokidar';
import glob from 'fast-glob';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import pc from 'picocolors';
import { Canister, getDfxCanisters } from './canister';
import { loadDfxConfig } from './dfx';
import { Settings } from './settings';
import { getVirtualFile } from './utils/motoko';
import wasm from './wasm';
import { FileCache } from './cache';

// Pattern to watch for file changes
const watchGlob = '**/*.mo';

// Paths to always exclude from the file watcher
const watchIgnore = ['**/node_modules/**/*', '**/.vessel/.tmp/**/*'];

let canisters: Canister[] | undefined;

const getEditedSource = (jsSource: string) => `// Modified by 'mo-dev'
${jsSource.replace('export const createActor', 'export const _createActor')}
export function createActor(canisterId, ...args) {
    if () {

    }
    return _createActor(canisterId, ...args);
}
`;

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

    const fileCache = new FileCache({ directory });

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
            log(
                1,
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
                    // log(0, `${pc.green('update')} ${pc.gray(canister.alias)}`);
                    const pipe = verbosity >= 1;
                    if (generate) {
                        const process = runCommand('dfx', {
                            args: ['generate', canister.alias],
                            pipe,
                        });
                        await finishProcess(process);
                        if (process?.exitCode === 0) {
                            log(
                                0,
                                pc.green(`generate ${pc.gray(canister.alias)}`),
                            );
                            if (hotReload) {
                                const outputPath = resolve(
                                    directory,
                                    canister.config.declarations?.output ||
                                        `src/declarations/${canister.alias}`,
                                );
                                const jsPath = resolve(outputPath, 'index.js');
                                if (existsSync(jsPath)) {
                                    try {
                                        const jsSource = readFileSync(
                                            jsPath,
                                            'utf8',
                                        );
                                        const editedSource =
                                            getEditedSource(jsSource);
                                        writeFileSync(
                                            jsPath,
                                            editedSource,
                                            'utf8',
                                        );
                                    } catch (err) {
                                        console.error(
                                            'Error while generating hot reload bindings:',
                                            err,
                                        );
                                    }
                                } else {
                                    console.error(
                                        'Error while generating hot reload bindings. File expected at path:',
                                        jsPath,
                                    );
                                }
                            }
                        }
                    }
                    if (deploy) {
                        const process = runCommand('dfx', {
                            args: [
                                'deploy',
                                canister.alias,
                                ...(verbosity >= 1 ? [] : ['-qq']),
                                ...(reinstall ? ['-y'] : []),
                            ],
                            // TODO: hide 'Module hash ... is already installed' warnings
                            pipe: pipe || !reinstall,
                        });
                        try {
                            deployProcesses.push(process);
                            await finishProcess(process);
                            if (process?.exitCode === 0) {
                                log(
                                    0,
                                    pc.green(
                                        `deploy ${pc.gray(canister.alias)}`,
                                    ),
                                );
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

    // Update a canister on the HMR server
    const updateCanister = (canister: Canister) => {
        try {
            if (hotReload) {
                const source = fileCache.get(canister.file);
                if (!source) {
                    console.warn(
                        'Missing source file for HMR server:',
                        canister.file,
                    );
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
                log(1, pc.blue(`${pc.bold(event)} ${path}`));
            }
            let shouldNotify = true;
            const resolvedPath = resolve(directory, path);
            if (event === 'unlink') {
                fileCache.invalidate(resolvedPath);
            } else {
                if (!fileCache.update(resolvedPath)) {
                    shouldNotify = false;
                }
                log(2, 'cache', resolvedPath);
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
