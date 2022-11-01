const DEV_SERVER_URL = 'http://localhost:7000';

export interface Canister {
    call(method: string, ...args: any[]): Promise<any>;
}
export class DevCanister implements Canister {
    public alias: string;

    constructor(alias: string) {
        this.alias = alias;
    }

    async call(method: string, ...args: any[]): Promise<any> {
        const response = await fetch(
            `${DEV_SERVER_URL}/alias/${this.alias}/${method}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    args,
                }),
            },
        );
        if (!response.ok) {
            throw new Error(
                `Error while calling ${this.alias}.${method}(${args
                    .map((a) => typeof a)
                    .join(', ')}): ${
                    (await response.text()) ||
                    response.statusText ||
                    `status code ${response.status}`
                }`,
            );
        }
        const body = await response.json();
        return body?.value;
    }
}

export class ReplicaCanister implements Canister {
    public id: string;

    constructor(id: string) {
        this.id = id;
    }

    async call(method: string, ...args: any[]): Promise<any> {
        throw new Error('Not yet implemented');
    }
}

export function devCanister(alias: string): DevCanister {
    return new DevCanister(alias);
}

export function replicaCanister(id: string): ReplicaCanister {
    return new ReplicaCanister(id);
}
