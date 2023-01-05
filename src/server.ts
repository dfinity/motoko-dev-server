import { createServer } from 'http';
import createApp from './app';
import { Settings } from './settings';

export function serve(settings: Settings) {
    if (settings.delay) {
        console.log('Adding artificial delay');
    }

    const devServerPort = +process.env.PORT || settings.port;

    const app = createApp(settings);
    const server = createServer(app);

    server.listen(devServerPort);
    console.log('Listening on port', devServerPort);

    return server;
}
