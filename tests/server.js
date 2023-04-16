const { Server, Client } = require('../main');

const server = new Server();

server.on('server-error', (err) => { console.log('hi') });
server.on('server-error', (err) => { console.log('hi') });
server.on('server-error', (err) => { console.log('hi') });


const listeners = server.listeners('server-error');


server.listen(443);