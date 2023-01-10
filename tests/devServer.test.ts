import { existsSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import devServer from '../src';

const projectPath = join(__dirname, 'project');
const outputPath = join(projectPath, 'output');

describe('mo-dev', () => {
    test('detects Motoko files', async () => {
        const logSpy = jest.spyOn(console, 'log');

        if (existsSync(outputPath)) {
            unlinkSync(outputPath);
        }

        const { watcher, server, close } = devServer({
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

        await new Promise((resolve) => setTimeout(resolve, 1000)); // TODO: deterministic

        files.sort();
        expect(files).toStrictEqual([
            'dfx.json',
            'motoko_canister/Main.mo',
            'motoko_canister/lib/Echo.mo',
        ]);

        expect(readFileSync(outputPath, 'utf8')).toEqual('ran command\n');

        close();
    });
});
