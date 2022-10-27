// Derived from: https://github.com/comino/cbor-body-parser/blob/master/index.js

const read = require('body-parser/lib/read');
const { decode: cborDecode } = require('cbor');
const bytes = require('bytes');
const debug = require('debug')('cbor-parser');
const typeis = require('type-is');

console.log(
    cborDecode(
        Buffer.from(
            'ÙÙ÷¡gcontent¤ningress_expiry\u001b\u0017\u001f\u0000~òtè\u0000epathsNrequest_statusX bÜ8\u0002\u0018L,\u0014`>·\u001a?J¨\u0019\u0018Ìë£Á\u0000`\u000b\u0016ÜÐlrequest_typejread_statefsenderA\u0004',
            'ascii',
        ),
    ).value.content,
);

interface CborOptions {
    limit: number | string;
    type: string;
    verify: boolean;
}

export default function cbor(
    options?: Partial<CborOptions>,
): import('express').Handler {
    const opts = options || {};
    const limit =
        typeof opts.limit !== 'number'
            ? bytes.parse(opts.limit || '100kb')
            : opts.limit;
    const type = opts.type || 'application/cbor';
    const verify = opts.verify || false;

    if (verify !== false && typeof verify !== 'function') {
        throw new TypeError('option verify must be function');
    }

    const shouldParse = typeof type !== 'function' ? typeChecker(type) : type;

    function parse(buf: Buffer) {
        if (buf.length === 0) {
            debug('buffer is zero');
            return {};
        }
        debug('parsing cbor content');
        return cborDecode(buf);
    }

    return function cborParser(req, res, next) {
        // @ts-ignore
        if (req._body) {
            return debug('body already parsed'), next();
        }

        req.body = req.body || {};

        // skip requests without bodies
        if (!typeis.hasBody(req)) {
            return debug('skip empty body'), next();
        }

        debug('content-type %j', req.headers['content-type']);

        if (!shouldParse(req)) {
            return debug('skip parsing'), next();
        }

        read(req, res, next, parse, debug, {
            encoding: null,
            limit: limit,
            verify: verify,
        });
    };
}

function typeChecker(type: any) {
    return function checkType(req: any) {
        return !!typeis(req, type);
    };
}
