import { createProxyMiddleware } from 'http-proxy-middleware';

const proxy = createProxyMiddleware({
    target: 'http://localhost:8001',
    // changeOrigin: true,
    // autoRewrite: true,
    // cookieDomainRewrite: 'localhost', ///
    // protocolRewrite: 'http',
    logLevel: 'debug',
    headers: {
        Connection: 'keep-alive',
    },
    timeout: 3000,
    onProxyReq(proxyReq, req, res) {
        // const origin = proxyReq.getHeader('origin');
        // if (typeof origin === 'string') {
        //     proxyReq.setHeader('origin', origin.replace(':8000', ':8001'));
        // }
        // const referer = proxyReq.getHeader('referer');
        // if (typeof referer === 'string') {
        //     proxyReq.setHeader('referer', referer.replace(':8000', ':8001'));
        // }

        // if (req.url.endsWith('rkp4c-7iaaa-aaaaa-aaaca-cai/query')) {
        //     console.log(proxyReq.getHeaders());
        //     // console.log(req.headers);
        // }
    },
});

export default proxy;
