
# Motoko Dev Server &nbsp;[![npm version](https://img.shields.io/npm/v/mo-dev.svg?logo=npm)](https://www.npmjs.com/package/mo-dev) [![GitHub license](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0) [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/dfinity/motoko-dev-server/issues)

> ### A rapid prototyping server for [Motoko](https://smartcontracts.org/) smart contracts.

---

## Installation:

Ensure that you have [Node.js](https://nodejs.org/en/) installed on your system.

```sh
npm i -g mo-dev
```

## Basic Usage:

Run the following command in a directory with a `dfx.json` file:

```sh
mo-dev
```

View the available CLI options by passing the `--help` flag:

```sh
mo-dev --help
```

Run `dfx deploy` on file change:

```sh
mo-dev -c "dfx deploy"
```

## Advanced Usage:

Show additional debug output in the console:

```sh
mo-dev -v # more verbose
mo-dev -vv # extra verbose
```

Add an artificial delay (similar to the expected latency when deployed on the IC):

```sh
mo-dev -d
```

Run on a specified port (default is `7700`):

```sh
mo-dev -p 7700
```

Programmatically start the development server from a JS environment:

```ts
import devServer from 'mo-dev';

devServer({
    verbosity: 1,
    // ...
});
```
