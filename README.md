
# `mo-dev` &nbsp;[![npm version](https://img.shields.io/npm/v/mo-dev.svg?logo=npm)](https://www.npmjs.com/package/mo-dev) [![GitHub license](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0) [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/dfinity/motoko-dev-server/issues)

> ### A [live reload](https://blog.logrocket.com/complete-guide-full-stack-live-reload/) development server for [Motoko](https://smartcontracts.org/) smart contracts.

---

`mo-dev` is a flexible command-line tool for speeding up your Motoko development workflow. 

- [Announcement blog post](https://ryanvandersmith.medium.com/announcing-the-motoko-dev-server-live-reloading-for-web3-dapps-20363088afb4)
- [Developer forum topic](https://forum.dfinity.org/t/announcing-mo-dev-live-reloading-for-motoko-dapps/21007)

## Try Online

Get started with a full-stack [Vite + React + Motoko](https://github.com/rvanasa/vite-react-motoko#readme) project directly in your browser:

[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/rvanasa/vite-react-motoko)

## Quick Start

Run the following command (requires [Node.js](https://nodejs.org/en/) ≥ 16):

```sh
npm i -g mo-dev
```

> Note: standalone `mo-dev` binaries are also available as [GitHub releases](https://github.com/dfinity/motoko-dev-server/releases). 

Once installed, view the available command-line options by passing the `--help` flag:

```sh
mo-dev --help
```

Check out the [Vite + React + Motoko](https://github.com/rvanasa/vite-react-motoko#readme) starter project for an example of how to integrate `mo-dev` into a modern full-stack webapp.

## Basic Features

Regenerate type declarations on Motoko file change (`--generate` or `-g`):

```sh
mo-dev --generate
```

Deploy canisters on Motoko file change (`--deploy` or `-d`):

```sh
mo-dev --deploy
```

Automatically respond "yes" to reinstall prompts (`--yes` or `-y`; may clear canister state):

```sh
mo-dev --deploy -y
```

Run unit tests (`*.test.mo`) on Motoko file change (`--test` or `-t`):

```sh
mo-dev --test
```

Run an arbitrary command on Motoko file change (`--exec` or `-x`):

```sh
mo-dev --exec 'npm run my-reload-script'
```

Specify the working directory (`--cwd` or `-C`; should contain a `dfx.json` file):

```sh
mo-dev --cwd path/to/dfx_project
```

Only run the dev server for specific canisters (`--canister` or `-c`):

```sh
mo-dev --canister foo --canister bar --deploy
```

Pass an installation argument to `dfx deploy` (`--argument` or `-a`):

```sh
mo-dev --deploy --argument '()'
```

## Advanced Features

Show additional debug output in the console (`--verbose` or `-v`):

```sh
mo-dev -v # more verbose
mo-dev -vv # extra verbose
```

Programmatically start `mo-dev` using JavaScript:

```js
import devServer from 'mo-dev';

// Default settings
devServer();

// Custom settings
devServer({
    directory: '.',
    port: 7700,
    verbosity: 0,
    // ...
});
```

## `mo-test`

The `mo-dev` npm package includes a `mo-test` command which can be used to run unit tests in CI workflows. 

View all available options:

```sh
mo-test --help
```

Run all Motoko unit tests (`*.test.mo`):

```sh
mo-test
```

Run all Motoko unit tests using a WASI runtime by default (faster but requires installing [Wasmtime](https://wasmtime.dev/) on your system):

```sh
mo-test --testmode wasi
```

Configure the runtime of an individual unit test by including the following comment in a `*.test.mo` file:

```motoko
// @testmode wasi
```

Run specific unit tests by passing a file name prefix (`-f` or `--testfile`):

```sh
mo-test -f Foo -f Bar # (only run tests for files starting with `Foo` or `Bar`)
```

These options may also be passed directly into the `mo-dev` command (e.g. `mo-dev --testmode wasi -f SomeTest`).

---

`mo-dev` is early in development. Please feel free to report a bug, ask a question, or request a feature on the project's [GitHub issues](https://github.com/dfinity/motoko-dev-server/issues) page. 

Contributions are welcome! Please check out the [contributor guidelines](https://github.com/dfinity/motoko-dev-server/blob/main/.github/CONTRIBUTING.md) for more information.
