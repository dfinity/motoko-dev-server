// import { startReplica } from './replica';
import server from './server';
import { program } from 'commander';
import { resolve } from 'path';
import { watch } from './watch';

const {} = program.argument('[directory]', 'dfx directory').parse().opts();

const directory = resolve(process.cwd(), program.args[0] || '.');

const devServerPort = +process.env.PORT || 7000;
// const replicaPort = +process.env.DFX_PORT || 8001;

server.listen(devServerPort);
console.log('Listening on port', devServerPort);

// startReplica(directory,replicaPort);
// console.log('Replica started on port', replicaPort);

watch(directory);
