// // Derived from: https://github.com/comino/cbor-body-parser/blob/master/index.js

// // @ts-ignore
// import read from 'body-parser/lib/read';
// import { decode as cborDecode } from 'cbor';
// import bytes from 'bytes';
// import typeis from 'type-is';

// const debug = require('debug')('cbor-parser');

// interface CborOptions {
//     limit: number | string;
//     type: string;
//     verify: boolean;
// }

// export default function cbor(
//     options?: Partial<CborOptions>,
// ): import('express').Handler {
//     const opts = options || {};
//     const limit =
//         typeof opts.limit !== 'number'
//             ? bytes.parse(opts.limit || '100kb')
//             : opts.limit;
//     const type = opts.type || 'application/cbor';
//     const verify = opts.verify || false;

//     if (verify !== false && typeof verify !== 'function') {
//         throw new TypeError('option verify must be function');
//     }

//     const shouldParse = typeof type !== 'function' ? typeChecker(type) : type;

//     function parse(buf: Buffer) {
//         if (buf.length === 0) {
//             debug('buffer is zero');
//             return {};
//         }
//         debug('parsing cbor content');
//         return cborDecode(buf);
//     }

//     return function cborParser(req, res, next) {
//         // @ts-ignore
//         if (req._body) {
//             return debug('body already parsed'), next();
//         }

//         req.body = req.body || {};

//         // skip requests without bodies
//         if (!typeis.hasBody(req)) {
//             return debug('skip empty body'), next();
//         }

//         debug('content-type %j', req.headers['content-type']);

//         if (!shouldParse(req)) {
//             return debug('skip parsing'), next();
//         }

//         read(req, res, next, parse, debug, {
//             encoding: null,
//             limit: limit,
//             verify: verify,
//         });
//     };
// }

// function typeChecker(type: any) {
//     return function checkType(req: any) {
//         return !!typeis(req, type);
//     };
// }
