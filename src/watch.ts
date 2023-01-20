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

// Canisters loaded from `dfx.json`
let canisters: Canister[] | undefined;

// Inject dev server logic into bindings created by `dfx generate`
const editJSBinding = (
    canister: Canister,
    source: string,
) => `// Modified by 'mo-dev'
${source.replace('export const createActor', 'export const _createActor')}
export function createActor(canisterId, ...args) {
    const alias = ${JSON.stringify(canister.alias)};
    const actor = _createActor(canisterId, ...args);
    if (process.env.NODE_ENV === 'development') {
      Object.keys(actor).forEach((methodName) => {
        actor[methodName] = async (...args) => {
          const response = await fetch(
            new URL(\`http://localhost:7700/call/\${alias}/\${methodName}\`),
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ args }),
            },
          );
          if (!response.ok) {
            throw new Error(
              \`Received status code \${response.status} from Motoko HMR server\`,
            );
          }
          const data = await response.json();
          return data.value;
        };
      });
    }
    return actor;
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
                // Skip for environments where Candid UI is not available
                if (!process.env.MO_DEV_HIDE_URLS) {
                    // Show Candid UI addresses
                    canisters.forEach((canister) => {
                        const id = canisterIds[canister.alias];
                        if (id) {
                            log(
                                0,
                                pc.cyan(
                                    `${pc.bold(
                                        `${canister.alias}`,
                                    )} → ${pc.white(
                                        `http://127.0.0.1:4943?canisterId=${uiAddress}&id=${id}`,
                                    )}`,
                                ),
                            );
                        }
                    });
                }
            }
        } else if (generate) {
            spawnSync('dfx', ['canister', 'create', '--all'], {
                cwd: directory,
                stdio: verbosity >= 1 ? 'inherit' : 'ignore',
                encoding: 'utf-8',
            });
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

    const finishProcess = async (
        process: ReturnType<typeof spawn>,
    ): Promise<number | null> => {
        if (typeof process.exitCode === 'number') {
            return process.exitCode;
        }
        return new Promise((resolve) =>
            process.on('close', () => resolve(process.exitCode)),
        );
    };

    let changeTimeout: ReturnType<typeof setTimeout> | undefined;
    let execProcess: ReturnType<typeof spawn> | undefined;
    let deployPromise: Promise<any> | undefined;
    const deployProcesses: ReturnType<typeof spawn>[] = [];
    const notifyChange = () => {
        clearTimeout(changeTimeout);
        changeTimeout = setTimeout(async () => {
            try {
                if (execute) {
                    if (execProcess) {
                        // kill(execProcess.pid);
                        await finishProcess(execProcess);
                    }
                    execProcess = runCommand(execute, { pipe: true });
                    // commandProcess.on('close', (code) => {
                    //     if (verbosity >= 1) {
                    //         console.log(
                    //             pc.dim('Command exited with code'),
                    //             code ? pc.yellow(code) : pc.gray(0),
                    //         );
                    //     }
                    // });
                }

                // Restart deployment
                // deployProcesses.forEach((p) => kill(p.pid));
                for (const process of deployProcesses) {
                    await finishProcess(process);
                }
                await deployPromise;
                deployProcesses.length = 0;

                deployPromise = Promise.resolve().then(async () => {
                    // TODO: only run for relevant canisters
                    for (const canister of canisters) {
                        // log(0, `${pc.green('update')} ${pc.gray(canister.alias)}`);
                        const pipe = verbosity >= 1;
                        if (generate) {
                            const process = runCommand('dfx', {
                                args: ['generate', canister.alias],
                                pipe,
                            });
                            const exitCode = await finishProcess(process);
                            if (exitCode === 0) {
                                log(
                                    0,
                                    pc.green(
                                        `generate ${pc.gray(canister.alias)}`,
                                    ),
                                );
                                if (hotReload) {
                                    const outputPath = resolve(
                                        directory,
                                        canister.config.declarations?.output ||
                                            `src/declarations/${canister.alias}`,
                                    );
                                    const jsPath = resolve(
                                        outputPath,
                                        'index.js',
                                    );
                                    if (existsSync(jsPath)) {
                                        try {
                                            const binding = readFileSync(
                                                jsPath,
                                                'utf8',
                                            );
                                            const newBinding = editJSBinding(
                                                canister,
                                                binding,
                                            );
                                            writeFileSync(
                                                jsPath,
                                                newBinding,
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
                            deployProcesses.push(process);
                            const exitCode = await finishProcess(process);
                            if (exitCode === 0) {
                                log(
                                    0,
                                    pc.green(
                                        `deploy ${pc.gray(canister.alias)}`,
                                    ),
                                );
                            }
                        }
                    }
                });
            } catch (err) {
                throw err;
                // console.error(err);
            }
        }, 100);
    };

    // Update a canister on the HMR server
    const updateCanister = (canister: Canister, { quiet = false } = {}) => {
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
                if (!quiet) {
                    log(0, pc.green(`update ${pc.gray(canister.alias)}`));
                }
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
    const removeCanister = (canister: Canister, { quiet = false } = {}) => {
        try {
            if (hotReload) {
                wasm.remove_canister(canister.alias);
                const file = getVirtualFile(canister.file);
                file.delete();
                if (!quiet) {
                    log(0, pc.green(`remove ${pc.gray(canister.alias)}`));
                }
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
            log(1, pc.blue(`${pc.bold(event)} ${path}`));
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
            const resolvedPath = resolve(directory, path);
            canisters?.forEach((canister) => {
                if (resolvedPath === canister.file) {
                    fileCache.update(resolvedPath);
                    updateCanister(canister, { quiet: true });
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
