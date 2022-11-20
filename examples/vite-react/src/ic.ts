// TODO: refactor into an npm package

import { HttpAgent, fetchCandid } from '@dfinity/agent';
import { IDL } from '@dfinity/candid';
import cbor from 'cbor';

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
    public agent: HttpAgent;

    private _candid: IDL.Type | undefined; ////

    constructor(id: string, agent: HttpAgent) {
        this.id = id;
        this.agent = agent;
    }

    private async fetchCandid() {
        if (this._candid) {
            return;
        }
        const source = await fetchCandid(this.id, this.agent);
        console.log('candid source:', source); //
        const candid = this._candid; //
        this._candid = candid;
        return candid;
    }

    async call(method: string, ...args: any[]): Promise<any> {
        const candid = this.fetchCandid();

        this.agent.call(this.id, {
            methodName: method,
            arg: cbor.encode([]), ////
        });
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
