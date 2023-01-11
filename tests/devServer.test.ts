import axios from 'axios';
import { existsSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import devServer from '../src';

const projectPath = join(__dirname, 'project');
const outputPath = join(projectPath, 'output');

const waitUntilLoaded = async () => {
    await new Promise((resolve) => setTimeout(resolve, 1000)); // TODO: deterministic
};

describe('mo-dev', () => {
    beforeEach(() => {
        if (existsSync(outputPath)) {
            unlinkSync(outputPath);
        }
    });

    test('detects Motoko files', async () => {
        const { watcher, close } = devServer({
            directory: projectPath,
            execute: `echo "ran command" >> output`,
        });

        const files: string[] = [];
        watcher.dfxJson.on('add', (file) => {
            files.push(file);
        });
        watcher.motoko.on('add', (file) => {
            files.push(file);
        });

        await waitUntilLoaded();
        try {
            files.sort();
            expect(files).toStrictEqual([
                'dfx.json',
                'replica_canister/Main.mo',
                'replica_canister/lib/Echo.mo',
                'vm_canister/Main.mo',
            ]);
        } finally {
            close();
        }
    });

    test('runs a provided command', async () => {
        const { close } = devServer({
            directory: projectPath,
            execute: `echo "ran command" >> output`,
        });

        await waitUntilLoaded();
        try {
            expect(readFileSync(outputPath, 'utf8')).toEqual('ran command\n');
        } finally {
            close();
        }
    });

    test('starts the VM server on a custom port', async () => {
        const port = 56789;
        const { close } = devServer({
            directory: projectPath,
            hotReload: true,
            port,
        });
        await waitUntilLoaded();
        try {
            const response = await axios.post(
                `http://localhost:${port}/call/vm_canister/main`,
                {
                    args: [],
                },
            );
            expect(response.data).toStrictEqual({ value: '123' });
        } finally {
            close();
        }
    });
});
