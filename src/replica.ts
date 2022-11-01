import { spawn } from 'child_process';

// Replica proxy fallback (currently unused)

export function startReplica(directory: string, port: number) {
    const replica = spawn(
        'dfx',
        [
            'start',
            // '--clean',
            '--host',
            `127.0.0.1:${port}`,
        ],
        {
            cwd: directory,
        },
    );
    replica.stdout.pipe(process.stdout);
    replica.stderr.pipe(process.stderr);

    return replica;
}
