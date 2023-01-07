import { spawn } from 'child_process';
import chokidar from 'chokidar';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import pc from 'picocolors';
import { Canister, getDfxCanisters } from './canister';
import { loadDfxConfig } from './dfx';
import { Settings } from './settings';
import { getVirtualFile } from './utils/motoko';
import wasm from './wasm';

// Paths to always exclude from the file watcher
const excludePaths = ['**/node_modules/**/*', '**/.vessel/.tmp/**/*'];

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
    live,
}: Settings) {
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

    let changeTimeout: ReturnType<typeof setTimeout> | undefined;
    let execProcess: ReturnType<typeof spawn> | undefined;
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

            const time = new Date().toLocaleTimeString();

            // TODO: only run for relevant canisters
            canisters.forEach((canister) => {
                console.log(
                    `${pc.dim(time)} ${pc.cyan(pc.bold('[mo-dev]'))} ${pc.green(
                        'update',
                    )} ${pc.gray(canister.alias)}`,
                );
                const pipe = verbosity >= 1;
                if (generate) {
                    runCommand('dfx', {
                        args: ['generate', '-q', canister.alias],
                        pipe,
                    });
                }
                if (deploy) {
                    runCommand('dfx', {
                        args: ['deploy', '-qy', canister.alias],
                        pipe,
                    });
                }
            });
        }, 100);
    };

    const updateCanister = (canister: Canister) => {
        try {
            if (live) {
                const source = readFileSync(canister.file, 'utf8');
                wasm.update_canister(canister.file, canister.alias, source);
                const file = getVirtualFile(canister.file);
                file.write(source);
            }
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

    // console.log(pc.gray('Waiting for Motoko file changes...'));

    const dfxWatcher = chokidar
        .watch('./dfx.json', { cwd: directory, ignored: excludePaths })
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
            canisters?.forEach((canister) => {
                updateCanister(canister);
            });
        });

    const moWatcher = chokidar
        .watch('**/*.mo', { cwd: directory, ignored: excludePaths })
        .on('all', (event, path) => {
            if (!path.endsWith('.mo')) {
                return;
            }
            if (verbosity >= 1) {
                console.log(pc.blue(`${pc.bold(event)} ${path}`));
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
