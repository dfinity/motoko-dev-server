import { program } from 'commander';
import { defaultSettings } from '../settings';
import { runTests } from '../test';
import { resolve } from 'path';

let verbosity = defaultSettings.verbosity;
const increaseVerbosity = () => verbosity++;

const examples: [string, string][] = [['-C', 'test/']];

const { cwd, version ,testMode} = program
    .name('mo-dev')
    .description(
        `Examples:\n${examples
            .map(
                ([usage, description]) =>
                    `  $ mo-test ${usage}  # ${description}`,
            )
            .join('\n')}`,
    )
    .option('-V, --version', `show installed version`)
    .option('-C, --cwd <cwd>', 'directory containing a `dfx.json` file')
    .option('-v, --verbose', `show more details in console`, increaseVerbosity)
    .option('--testmode', `default test mode (interpreter, wasi)`)
    .parse()
    .opts();

if (version) {
    console.log('mo-test', require('../../package.json').version);
    process.exit(0);
}

runTests({
    directory: resolve(cwd || defaultSettings.directory),
    verbosity,
    testMode,
});
