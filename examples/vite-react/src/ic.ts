export class Canister {
    async call<T>(method: string, ...args: any[]): Promise<T> {
        // TODO
        throw new Error('Not yet implemented');
    }
}

export function getCanister(alias: string): Canister {
    // TODO
    throw new Error('Not yet implemented');
}
