
# `mo-dev` &nbsp;[![npm version](https://img.shields.io/npm/v/mo-dev.svg?logo=npm)](https://www.npmjs.com/package/mo-dev) [![GitHub license](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0) [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/dfinity/motoko-dev-server/issues)

> ### A [live reload](https://blog.logrocket.com/complete-guide-full-stack-live-reload/) development server for [Motoko](https://smartcontracts.org/) smart contracts.

---

`mo-dev` is a flexible command-line tool for speeding up your Motoko development workflow. 

## Try Online

Get started with a full-stack [Vite + React + Motoko](https://github.com/dfinity/motoko-dev-server/tree/main/examples/vite-react#readme) project directly in your browser:

[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/rvanasa/vite-react-motoko)

## Quick Start

Make sure that [Node.js](https://nodejs.org/en/) `>= 16.x` is installed on your system, and then run the following command:

```sh
npm i -g mo-dev
```

View the available command-line options by passing the `--help` flag:

```sh
mo-dev --help
```

Check out the [Vite + React + Motoko](https://github.com/dfinity/motoko-dev-server/tree/main/examples/vite-react/) starter project for an example of how to integrate `mo-dev` into a modern full-stack webapp.

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

Specify the working directory (`--cwd` or `-c`; should contain a `dfx.json` file):

```sh
mo-dev --cwd path/to/dfx_project
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

---

`mo-dev` is early in development. Please feel free to report a bug, ask a question, or request a feature on the project's [GitHub issues](https://github.com/dfinity/motoko-dev-server/issues) page. 

Contributions are welcome! Please check out the [contributor guidelines](https://github.com/dfinity/motoko-dev-server/blob/main/.github/CONTRIBUTING.md) for more information.
