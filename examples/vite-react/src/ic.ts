// TODO: refactor into an npm package

import { Actor, ActorSubclass, HttpAgent, fetchCandid } from '@dfinity/agent';
import { IDL } from '@dfinity/candid';
import { Principal } from '@dfinity/candid/lib/cjs/idl';

const DEV_SERVER_URL = 'http://localhost:7700';

export interface Canister {
    call(method: string, ...args: any[]): Promise<any>;
}
export class DevCanister implements Canister {
    public readonly alias: string;

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
    public readonly id: string;
    public readonly agent: HttpAgent;

    private _actor: ActorSubclass | undefined;

    constructor(id: string, agent: HttpAgent) {
        this.id = id;
        this.agent = agent;
    }

    private async fetchActor() {
        if (this._actor) {
            return this._actor;
        }
        const source = await fetchCandid(this.id, this.agent);
        const didJsCanisterId = 'ryjl3-tyaaa-aaaaa-aaaba-cai';
        const didJsInterface: IDL.InterfaceFactory = ({ IDL }) =>
            IDL.Service({
                did_to_js: IDL.Func([IDL.Text], [IDL.Opt(IDL.Text)], ['query']),
            });
        const didJs: ActorSubclass = Actor.createActor(didJsInterface, {
            canisterId: didJsCanisterId,
            agent: this.agent,
        });
        const js = ((await didJs.did_to_js(source)) as [string])[0];
        const candid = await eval(
            `import("data:text/javascript;charset=utf-8,${encodeURIComponent(
                js,
            )}")`,
        );
        const actor = Actor.createActor(candid.idlFactory, {
            agent: this.agent,
            canisterId: this.id,
        });
        this._actor = actor;
        return actor;
    }

    async call(method: string, ...args: any[]): Promise<any> {
        const actor = await this.fetchActor();
        const result = await actor[method](...args);

        console.log('RESULT:', result); ////

        // Convert to JSON-like object
        return JSON.parse(
            JSON.stringify(result, (_key, value) => {
                if (typeof value === 'bigint') {
                    return value.toString();
                }
                return value;
            }),
        );
    }
}

export function devCanister(alias: string): DevCanister {
    return new DevCanister(alias);
}

export function replicaCanister(
    id: string,
    agent: HttpAgent | undefined = undefined,
): ReplicaCanister {
    if (!agent) {
        agent = new HttpAgent();
        if (agent.isLocal()) {
            agent.fetchRootKey();
        }
    }
    return new ReplicaCanister(id, agent);
}
