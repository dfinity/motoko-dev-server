
# `mo-dev` &nbsp;[![npm version](https://img.shields.io/npm/v/mo-dev.svg?logo=npm)](https://www.npmjs.com/package/mo-dev) [![GitHub license](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0) [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/dfinity/motoko-dev-server/issues)

> ### A [live reload](https://blog.logrocket.com/complete-guide-full-stack-live-reload/) development server for [Motoko](https://smartcontracts.org/) smart contracts.

---

`mo-dev` enables fast Motoko canister development in parallel with a front-end web application. 

This command-line tool exposes a canister REST API callable from [Vite](https://vitejs.dev/), [Next.js](https://nextjs.org/), [create-react-app](https://create-react-app.dev/), and almost any other live reloading development framework via the [`ic0`](https://www.npmjs.com/package/ic0) npm package. 

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

Regenerate type declarations upon detecting a Motoko file change (`--generate` or `-g`):

```sh
mo-dev --generate
```

Redeploy canisters upon detecting a Motoko file change (`--deploy` or `-d`):

```sh
mo-dev --deploy
```

Run an arbitrary command upon detecting a Motoko file change (`--exec` or `-x`):

```sh
mo-dev --exec 'npm run reload'
```

## Advanced Usage

Enable the experimental Motoko VM live reload server (`--live` or `-l`):

```sh
mo-dev --live
```

Show additional debug output in the console (`--verbose` or `-v`):

```sh
mo-dev -v # more verbose
mo-dev -vv # extra verbose
```

Run on a specified port (`--port` or `-p`; default is `7700`):

```sh
mo-dev -p 7700
```

Programmatically start the development server using JavaScript:

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

## Web Development

For most use cases, the [`ic0`](https://www.npmjs.com/package/ic0) npm package is the simplest way to interact with the Dev Server from a front-end web application:

```js
import { devCanister } from 'ic0';

const backend = devCanister('backend'); // Use the canister named "backend" from your `dfx.json` config file
const result = backend.call('echo', 123); // Call the `echo` method with 123 as input

console.log(result); // => 123
```

## REST API

If you are unable to use `ic0` in your environment or want lower-level access to the Dev Server's functionality, the following example illustrates how you can call a Motoko canister via the REST API. 

Let's say that you have a Motoko actor named `"backend"` in your `dfx.json` file, and you just added a method named `echo` to this actor. Calling `echo(x)` will return the original input value `x`.

If you want to immediately run the new `echo` method without redeploying the canister using `dfx deploy`, you can call the following API endpoint (served by `mo-dev`):

```
POST http://localhost:7700/call/{dfx_canister_alias}/{method}
```

Here is what you would use for our specific example:

```
POST http://localhost:7700/call/backend/echo
```

In the body of the request, provide a JSON object with an array for the `args` key. For example, `{"args":[123]}` would pass `123` as the input value.

If successful, you will receive a corresponding JSON response such as `{"value":123}`. Otherwise, you will most likely encounter a `400` (invalid request) or `500` (evaluation error) response code from the API. 

---

`mo-dev` is early in development. Please feel free to report a bug, ask a question, or request a feature on the project's [GitHub issues](https://github.com/dfinity/motoko-dev-server/issues) page. 