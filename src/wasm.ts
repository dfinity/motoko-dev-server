// import wasm from '../wasm/pkg/nodejs/wasm';
// export default wasm;

// Wasm functionality is currently unused
export default {
    update_settings(settings: any) {},
    update_canister(path: string, alias: string, source: string) {
        throw new Error('Unsupported runtime');
    },
    remove_canister(alias: string) {
        throw new Error('Unsupported runtime');
    },
    call_canister(...args: any[]) {
        throw new Error('Unsupported runtime');
    },
    candid_to_js(candid: string) {
        throw new Error('Unsupported runtime');
    },
};
