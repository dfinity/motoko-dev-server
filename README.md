
# `mo-dev` &nbsp;[![npm version](https://img.shields.io/npm/v/mo-dev.svg?logo=npm)](https://www.npmjs.com/package/mo-dev) [![GitHub license](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0) [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/dfinity/motoko-dev-server/issues)

> ### A [live reload](https://blog.logrocket.com/complete-guide-full-stack-live-reload/) development server for [Motoko](https://smartcontracts.org/) smart contracts.

---

`mo-dev` enables fast Motoko canister development in parallel with a front-end web application. 

This server is designed to work with [Vite](https://vitejs.dev/), [Next.js](https://nextjs.org/), [create-react-app](https://create-react-app.dev/), and almost any other front-end development framework via the [`ic0` npm package](https://www.npmjs.com/package/ic0). 

## Quick Start

Check out the [Vite + React + Motoko](https://github.com/dfinity/motoko-dev-server/tree/main/examples/vite-react/) starter project for an example of how to integrate `mo-dev` into a modern web application.

## Installation

Ensure that you have [Node.js](https://nodejs.org/en/) `>= 16.x` installed on your system.

```sh
npm i -g mo-dev
```

## Basic Usage

Run the following command in a directory with a `dfx.json` file:

```sh
mo-dev
```

View the available command-line options by passing the `--help` flag:

```sh
mo-dev --help
```

Automatically redeploy your dapp on Motoko file changes using the following command:

```sh
mo-dev -c "dfx deploy"
```

## Advanced Usage

Show additional debug output in the console:

```sh
mo-dev -v # more verbose
mo-dev -vv # extra verbose
```

Run on a specified port (default is `7700`):

```sh
mo-dev -p 7700
```

Add an artificial delay to simulate message latency on the IC:

```sh
mo-dev -d
```

Programmatically start the development server from a JS environment:

```ts
import devServer from 'mo-dev';

devServer({
    verbosity: 1,
    // ...
});
```

---

Since `mo-dev` is early in development, please feel free to report a bug, ask a question, or request a feature on the project's [GitHub issues](https://github.com/dfinity/motoko-dev-server/issues) page. 