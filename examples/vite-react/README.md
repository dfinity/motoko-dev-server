# Vite + React + Motoko

## Setup

Ensure that [Node.js](https://nodejs.org/en/) and [dfx](https://internetcomputer.org/docs/current/developer-docs/build/install-upgrade-remove) are installed on your system.

Run the following commands in a new, empty project directory:

```sh
npx degit dfinity/motoko-dev-server/examples/vite-react # Download the starter project
dfx start --clean --background # Run dfx in the background
npm run setup # Install packages, deploy canisters, and generate type bindings

npm start # Start the development server
```

When ready, run `dfx deploy` to fully build and deploy your application.

## Advanced Usage

If you want to separate the Vite and Motoko console outputs, consider running each of the following commands in a separate terminal:

```sh
npm run frontend # Vite dev server
npm run backend # Motoko dev server
```
