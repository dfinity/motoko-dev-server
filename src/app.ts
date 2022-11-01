import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
// import helmet from 'helmet';
// import hpp from 'hpp';
import morgan from 'morgan';
import proxy from './proxy';
import routes from './routes';

const app = express();

app.use(morgan('dev'));
app.use(cors());
// app.use(hpp());
// app.use(helmet({ contentSecurityPolicy: false }));
// app.use(compression());
// app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

routes.forEach((route) => route(app));

app.use((err: any, _req: any, res: any, _next: any) => {
    console.error(err);
    res.status(500).end();
});

// app.use(express.static(join(__dirname, '../public')));

// app.use(proxy);

export default app;
