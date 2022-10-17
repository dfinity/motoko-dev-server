import express from 'express';
import proxy from '../proxy';
import cbor from '../utils/cborBodyParser';

// const router = express.Router();

interface Message {
    arg: Buffer;
    canister_id: Buffer;
    ingress_expiry: number;
    method_name: string;
    request_type: string;
    sender: Buffer;
}

export default (app: express.Application) => {
    app.post(
        '/api/v2/canister/:id([^/]+)/:method',
        (req, res, next) => {
            try {
                const { id, method } = req.params;

                if (
                    id === 'rkp4c-7iaaa-aaaaa-aaaca-cai' ||
                    method === 'read_state'
                ) {
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
                const message: Message = req.body.value.content;

                console.log(id, message);

                // res.status(500).send('Unimplemented');
                res.status(500).end();
            } catch (err) {
                next(err);
            }
        },
    );
};

// export default router;
