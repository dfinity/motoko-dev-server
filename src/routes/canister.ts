import { json } from 'body-parser';
import express from 'express';
import { Settings } from '../settings';
import { getVirtualFile } from '../utils/motoko';
import wasm from '../wasm';
import { findCanister } from '../watch';
import { IDL } from '@dfinity/candid';

export default (app: express.Application, { delay }: Settings) => {
    app.post('/alias/:alias([^/]+)/:method', json(), async (req, res, next) => {
        try {
            const { alias, method } = req.params;
            const message = req.body;

            console.log(`${alias}.${method}`, message);

            const args = message?.args || [];
            if (!Array.isArray(args)) {
                return res
                    .status(400)
                    .json({ message: '`args` must be an array' });
            }

            const canister = findCanister(alias);
            if (!canister) {
                return res
                    .status(400)
                    .json({ message: `Unknown canister: ${canister}` });
            }
            const candidSource = getVirtualFile(canister.file).candid();
            const candidJs = wasm.candid_to_js(candidSource);
            if (!candidJs) {
                return res.status(400).json({
                    message: `Unable to parse Candid for canister: ${alias}`,
                });
            }
            const idlFactory: IDL.InterfaceFactory = (
                await eval(
                    `import(${JSON.stringify(
                        `data:text/javascript;charset=utf-8,${encodeURIComponent(
                            candidJs,
                        )}`,
                    )})`,
                )
            ).idlFactory;
            const service = idlFactory({ IDL });

            const field = service._fields.find(([m]) => m === method)?.[1];
            if (!field) {
                return res.status(400).json({
                    message: `Unknown canister method: ${alias}.${method}`,
                });
            }

            const candid = IDL.encode(field.argTypes, args);

            const value = wasm.call_canister(
                alias,
                method,
                new Uint8Array(candid),
            );

            console.log('Value:', JSON.stringify(value));

            res.json({
                value,
            });
        } catch (err) {
            next(err);
        }
    });
};

// export default router;
