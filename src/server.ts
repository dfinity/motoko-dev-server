import { createServer } from 'http';
import createApp from './app';
import { Settings } from './settings';
import pc from 'picocolors';

export async function serve(settings: Settings) {
    if (settings.verbosity >= 1 && settings.delay) {
        console.log(pc.gray('Adding artificial delay'));
    }

    const devServerPort = +process.env.PORT || settings.port;

    const app = createApp(settings);
    const server = createServer(app);

    server.listen(devServerPort);
    console.log(`HMR server listening on port ${pc.bold(devServerPort)}`);

    return server;
}
