const EventEmitter = require('events');

const express = require('express');
const ws = require('ws');

const SECOND = 1000,
    MINUTE = 60 * SECOND;
;

/**
 * @emits Server#event:listen
 */
class Server extends EventEmitter {

    timeout = 1000;

    pingInterval = 3 * SECOND;

    pong_timeout_limit = 15 * SECOND;

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

    broadcast(msg) {
        if (typeof msg == 'object') msg = JSON.stringify(msg);

        this.WS_server.clients.forEach((socket) => {
            this.sendSocket(socket, msg);
        });
    }

    sendSocket(socket, msg) {
        if (!socket._isalive) {
            close(socket);
            return;
        }
        if (socket.readyState !== ws.OPEN) {
            setTimeout(() => this.sendSocket(socket, msg), this.timeout);
            return;
        }
        socket.send(msg);
    }

}

function handle_WS_server_listeners(serverInstance) {
    serverInstance.WS_server.on('connection', socket => {

        serverInstance.emit('open', socket);
        serverInstance.emit('connection', socket);

        socket._isalive = true;
        socket._lastPong = Date.now();

        socket._pingInterval = setInterval(() => sendPing(serverInstance, socket), serverInstance.pingInterval);

        socket.on('message', (...args) => {
            serverInstance.emit('message', socket, ...args);
        });

        socket.on('error', (...args) => {
            socket._isalive = false;
            serverInstance.emit('error', socket, ...args);
            close(socket);
        });

        socket.on('close', (...args) => {
            socket._isalive = false;
            serverInstance.emit('close', socket, ...args);

            close(socket);
        });

        socket.on('ping', (...args) => {
            serverInstance.emit('ping', ...args);
        });

        socket.on('pong', (...args) => {
            socket._lastPong = Date.now();
            serverInstance.emit('pong', ...args);
        })

    })
}

function sendPing(serverInstance, socket) {
    if (Date.now() - socket._lastPong > serverInstance.pong_timeout_limit) {
        close(socket);
    } else if (socket._isalive) {
        socket.ping();
    } else {
        close(socket);
    }
}

function close(socket) {
    clearInterval(socket._pingInterval);

    try {
        socket.terminate();
        socket.destroy();
    } catch (err) {

    }
}

function handle_Server_listener(serverInstance) {

    serverInstance.listen = async (...args) => {

        const server = serverInstance.app.listen(...args);

        server.on('error', (err) => serverInstance.emit('server-error', err))

        server.on('request', (...args) => serverInstance.emit('server-request', ...args));

        server.on('connection', (...args) => serverInstance.emit('server-connection', ...args));

        server.on('upgrade', async (request, socket, head) => {

            const cb_listeners = [];
            cb_listeners.push(...serverInstance.listeners('server-upgrade'));
            cb_listeners.push(...serverInstance.listeners('authentication'));
            console.log(cb_listeners)

            let isValid = true;
            for await (const cb_listener of cb_listeners) {
                const success = await cb_listener(request, socket, head);
                if (success == false) {
                    isValid = false;
                    break;
                }
            }
            if (!isValid) {
                socket.destroy();
                return
            };

            serverInstance.WS_server.handleUpgrade(request, socket, head, socket => {
                serverInstance.WS_server.emit('connection', socket, request);
            });

        })

        return server;

    }

}

module.exports = Server;