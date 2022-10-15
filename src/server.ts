import { createServer } from 'http';
import app from './app';

const server = createServer(app);

export default server;
