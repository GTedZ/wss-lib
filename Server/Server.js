const EventEmitter = require('events');

const express = require('express');
const ws = require('ws');

/**
 * @emits Server#event:listen
 */
class Server extends EventEmitter {

    app;

    server;

    WS_server;

    constructor() {
        super();

        this.app = express();

        this.WS_server = new ws.Server({ noServer: true });

        handle_WS_server_listeners(this);

        handle_Server_listener(this);

    }

    listen = express().listen;

}

function handle_WS_server_listeners(serverInstance) {

}

function handle_Server_listener(serverInstance) {

    serverInstance.listen = async (...args) => {

        const server = serverInstance.app.listen(...args);

        server.on('error', (err) => serverInstance.emit('server-error', err))

        server.on('request', (...args) => serverInstance.emit('server-request', ...args));

        server.on('connection', (...args) => serverInstance.emit('server-connection', ...args));

        server.on('upgrade', async (request, socket, head) => {

            const cb_listeners = server.listeners('server-upgrade');

            let isValid = true;
            for await (const cb_listener of cb_listeners) {
                const success = await cb_listener(request, socket, head);
                if (success == false) {
                    isValid = false;
                    break;
                }
            }
            if (!isValid) return;

            serverInstance.WS_server.handleUpgrade(request, socket, head, socket => {
                serverInstance.WS_server.emit('connection', socket, request);
            });

        })

        return server;

    }

}

module.exports = Server;


// wsServer = new ws.Server({ noServer: true });
// wsServer.on('connection', socket => {
//     socket.firstMessage = true;
//     socket.username = undefined;
//     socket.on('message', message => {
//         let data = JSON.parse(message.toString());
//         if (socket.firstMessage) checkUser(data, socket);
//         socket.firstMessage = false;
//     });

//     socket.on('close', () => {
//         if (socket.username != undefined) {
//         }
//     })
// });

// const server = app.listen(443, () => { console.log('Server is on!') });

// server.on('upgrade', (request, socket, head) => {
//     wsServer.handleUpgrade(request, socket, head, socket => {
//         wsServer.emit('connection', socket, request);
//     });
// });