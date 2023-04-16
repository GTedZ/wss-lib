function setUpWebSocketServer() {
    var express = require('express');
    const ws = require('ws');
    const app = express();

    // socketClients = new Map();

    wsServer = new ws.Server({ noServer: true });
    wsServer.on('connection', socket => {
        socket.firstMessage = true;
        socket.username = undefined;
        socket.on('message', message => {
            let data = JSON.parse(message.toString());
            if (socket.firstMessage) checkUser(data, socket);
            socket.firstMessage = false;
        });

        socket.on('close', () => {
            if (socket.username != undefined) {
            }
        })
    });

    const server = app.listen(443, () => { console.log('Server is on!') });

    server.on('upgrade', (request, socket, head) => {
        wsServer.handleUpgrade(request, socket, head, socket => {
            wsServer.emit('connection', socket, request);
        });
    });
}