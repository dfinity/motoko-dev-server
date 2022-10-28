import express from 'express';
import cbor from '../utils/cborBodyParser';
import { encode as cborEncode } from 'cbor';
import wasm from '../wasm';

// const router = express.Router();

const uiCanister = 'ryjl3-tyaaa-aaaaa-aaaba-cai'; // TODO: detect from `canister_ids.json`

interface CborMessage {
    arg: Buffer;
    canister_id: Buffer;
    ingress_expiry: BigInt;
    method_name: string;
    nonce: Buffer;
    request_type: string;
    sender: Buffer;
}

interface Message {
    arg: number[];
    canister_id: number[];
    ingress_expiry: string;
    method_name: string;
    nonce: number[];
    request_type: string;
    sender: number[];
}

function fromCborMessage(cborMessage: CborMessage): Message {
    // console.log(cborMessage); ///
    return {
        arg: toByteArray(cborMessage.arg),
        canister_id: toByteArray(cborMessage.canister_id),
        ingress_expiry: cborMessage.ingress_expiry.toString(),
        method_name: cborMessage.method_name,
        nonce: toByteArray(cborMessage.nonce),
        request_type: cborMessage.request_type,
        sender: toByteArray(cborMessage.sender),
    };
}

function toCborMessage(jsonmessage: Message): CborMessage {
    return {
        arg: toBuffer(jsonmessage.arg),
        canister_id: toBuffer(jsonmessage.canister_id),
        ingress_expiry: BigInt(jsonmessage.ingress_expiry),
        method_name: jsonmessage.method_name,
        nonce: toBuffer(jsonmessage.nonce),
        request_type: jsonmessage.request_type,
        sender: toBuffer(jsonmessage.sender),
    };
}

function toByteArray(buffer: Buffer): number[] {
    return [...new Uint8Array(buffer)];
}

function toBuffer(array: number[]): Buffer {
    const buf = Buffer.alloc(array.length);
    for (let i = 0; i < buf.length; i++) {
        buf[i] = array[i];
    }
    return buf;
}

export default (app: express.Application) => {
    app.post(
        '/api/v2/canister/:id([^/]+)/:method',
        (req, res, next) => {
            try {
                const { id, method } = req.params;

                if (id === uiCanister || method === 'read_state') {
                    console.log('Skipping:', id);

                    return next('route');
                }

                next();
            } catch (err) {
                next(err);
            }
        },
        cbor(),
        (req, res, next) => {
            try {
                const { id, method } = req.params;
                const message = fromCborMessage(req.body.value.content);

                console.log(id, message);

                // TODO: canister id to alias
                const alias = id;
                const result = wasm.handle_message(alias, method, message);

                console.log('Result:', result); ///

                // res.status(500).send('Unimplemented');
                // res.status(200).end();
                res.status(200).send(cborEncode(result));
            } catch (err) {
                next(err);
            }
        },
    );
};

// export default router;
