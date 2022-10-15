import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
// import helmet from 'helmet';
// import hpp from 'hpp';
import morgan from 'morgan';
import routes from './routes';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { join } from 'path';

const app = express();

app.use(morgan('combined'));
app.use(cors());
// app.use(hpp());
// app.use(helmet());
app.use(compression());
// app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

routes.forEach((route) => app.use(route));

app.use((err: any, _req: any, res: any, _next: any) => {
    console.error(err);
    res.code(500).end();
});

// app.use(express.static(join(__dirname, '../public')));

app.use(
    createProxyMiddleware({
        target: 'http://localhost:8001',
    }),
);

export default app;
