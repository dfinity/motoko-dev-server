const DEV_SERVER_URL = 'http://localhost:7000';

export class Canister {
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

export function getDevCanister(alias: string): Canister {
    return new Canister(alias);
}
