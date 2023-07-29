import axios from 'axios';
import { existsSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import devServer from '../src';

const projectPath = join(__dirname, 'project');

const waitUntilLoaded = async () => {
    await new Promise((resolve) => setTimeout(resolve, 1000)); // TODO: deterministic
};

describe('mo-dev', () => {
    test('detects Motoko files', async () => {
        const { watcher, close } = await devServer({
            directory: projectPath,
            ci: false,
        });

        const files: string[] = [];
        watcher!.dfxJson.on('add', (file) => {
            files.push(file);
        });
        watcher!.motoko.on('add', (file) => {
            files.push(file);
        });

        await waitUntilLoaded();
        try {
            files.sort();
            expect(
                files.filter((file) => !file.startsWith('.mops')),
            ).toStrictEqual([
                'dfx.json',
                'motoko_canister/Main.mo',
                'motoko_canister/lib/Echo.mo',
                'motoko_canister/test/DefaultFail.test.mo',
                'motoko_canister/test/DefaultPass.test.mo',
                'motoko_canister/test/ImportPass.test.mo',
                'motoko_canister/test/WasiError.test.mo',
                'motoko_canister/test/WasiFail.test.mo',
                'motoko_canister/test/WasiPass.test.mo',
                'vm/tests/Main.test.mo',
                'vm/vm_canister/Main.mo',
            ]);
        } finally {
            close();
        }
    });

    test('runs a provided command', async () => {
        const outputPath = join(projectPath, 'generated.txt');
        if (existsSync(outputPath)) {
            unlinkSync(outputPath);
        }

        const { close } = await devServer({
            directory: projectPath,
            execute: `echo "ran command" >> generated.txt`,
            ci: false,
        });

        await waitUntilLoaded();
        try {
            expect(readFileSync(outputPath, 'utf8')).toEqual('ran command\n');
        } finally {
            close();
        }
    });

    test.skip('generates type bindings', async () => {
        const declarationPath = join(
            projectPath,
            'src/declarations/motoko_canister/index.js',
        );
        if (existsSync(declarationPath)) {
            unlinkSync(declarationPath);
        }

        const { close } = await devServer({
            directory: projectPath,
            generate: true,
            ci: false,
        });

        await waitUntilLoaded();
        try {
            expect(existsSync(declarationPath));
        } finally {
            close();
        }
    });

    test.skip('starts the VM server on a custom port', async () => {
        const port = 56789;
        const { close } = await devServer({
            directory: join(projectPath, 'vm'),
            hotReload: true,
            port,
            ci: false,
        });
        await waitUntilLoaded();
        try {
            const response = await axios.post(
                `http://localhost:${port}/call/vm_canister/main`,
                { args: [] },
            );
            expect(response.data).toStrictEqual({ value: '123' });
        } finally {
            close();
        }
    });
});
