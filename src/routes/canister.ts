import express from 'express';
import wasm from '../wasm';
import { json } from 'body-parser';

export default (app: express.Application) => {
    app.post('/alias/:alias([^/]+)/:method', json(), (req, res, next) => {
        try {
            const { alias, method } = req.params;
            const message = req.body;

            console.log(alias, message);

            const result = wasm.handle_message(alias, method, message);

            console.log('RESULT:', result); ///

            res.status(200).json(result);
        } catch (err) {
            next(err);
        }
    });
};

// export default router;
