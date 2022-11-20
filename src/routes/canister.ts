import express from 'express';
import wasm from '../wasm';
import { json } from 'body-parser';
import { Settings } from '../settings';

export default (app: express.Application, { delay }: Settings) => {
    app.post('/alias/:alias([^/]+)/:method', json(), (req, res, next) => {
        try {
            const { alias, method } = req.params;
            const message = req.body;

            console.log(alias, message);

            const args = message?.args || [];

            const candid = new Uint8Array([]); /////

            const value = wasm.call_canister(alias, method, candid);

            console.log('Value:', JSON.stringify(value)); ///

            res.json({
                value,
            });
        } catch (err) {
            next(err);
        }
    });
};

// export default router;
