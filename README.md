
# `mo-dev` &nbsp;[![npm version](https://img.shields.io/npm/v/mo-dev.svg?logo=npm)](https://www.npmjs.com/package/mo-dev) [![GitHub license](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0) [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/dfinity/motoko-dev-server/issues)

> ### A [live reload](https://blog.logrocket.com/complete-guide-full-stack-live-reload/) development server for [Motoko](https://smartcontracts.org/) smart contracts.

---

`mo-dev` is a flexible command-line tool for speeding up your Motoko development workflow. 

## Try Online

Get started with a full-stack [Vite + React + Motoko](https://github.com/dfinity/motoko-dev-server/tree/main/examples/vite-react) project directly in your browser:

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

Redeploy canisters on Motoko file change (`--deploy` or `-d`):

```sh
mo-dev --deploy
```

Run an arbitrary command on Motoko file change (`--exec` or `-x`):

```sh
mo-dev --exec 'npm run my-reload-script'
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

## Experimental Features

Enable the [Motoko VM](https://github.com/dfinity/motoko.rs) hot module reload (HMR) server (`--hot-reload`, `-r`):

```sh
mo-dev --hot-reload
```

Run the HMR server on a specified port (`--port` or `-p`; default is `7700`):

```sh
mo-dev --port 7700
```

Hot module reloading makes it possible to preserve a Motoko actor's state between code changes. This feature is powered by the [Motoko VM](https://github.com/dfinity/motoko.rs), a work-in-progress Motoko interpreter written in Rust.

For most use cases, [`ic0`](https://www.npmjs.com/package/ic0) is the simplest way to try this feature in a JavaScript environment:

```js
import { devCanister } from 'ic0';

const backend = devCanister('backend'); // Use the canister named "backend" from your `dfx.json` config file
const result = backend.call('echo', 123); // Call the `echo` method with 123 as input

console.log(result); // => 123
```

If you are using a different programming language or want lower-level access to this functionality, the following example illustrates how you can interact with a Motoko VM canister using the REST API. 

Let's say that you have a Motoko actor named `"backend"` in your `dfx.json` file, and you just added a method named `echo` to this actor. Calling `echo(x)` will return the original input value `x`.

If you want to immediately run the new `echo` method without redeploying the canister using `dfx deploy`, you can call the following API endpoint (served by `mo-dev`):

```
POST http://localhost:7700/call/{dfx_canister_alias}/{method}
```

For our specific example:

```
POST http://localhost:7700/call/backend/echo
```

In the body of the request, provide a JSON object with an array for the `args` key. For example, `{"args":[123]}` would pass `123` as the input value.

If successful, you will receive a corresponding JSON response such as `{"value":123}`. Otherwise, you will most likely encounter a `400` (invalid request) or `500` (evaluation error) response code from the API. 

---

`mo-dev` is early in development. Please feel free to report a bug, ask a question, or request a feature on the project's [GitHub issues](https://github.com/dfinity/motoko-dev-server/issues) page. 