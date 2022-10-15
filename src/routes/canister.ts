import express from 'express';
import cbor from '../utils/cborBodyParser';

const router = express.Router();

interface Message {
    arg: Buffer;
    canister_id: Buffer;
    ingress_expiry: number;
    method_name: string;
    request_type: string;
    sender: Buffer;
}

router.post('/api/v2/canister/:id([^/]+)/:method', cbor(), (req, res, next) => {
    try {
        const { id, method } = req.params;
        const message: Message = req.body.value.content;

        console.log(id, message); ////

        res.status(200).send();
    } catch (err) {
        console.error(err); ///////
        next(err);
    }
});

export default router;
