const { Server, Client } = require('../main');

const server = new Server();

server.listen(443, () => console.log('server is active'));

server.on('message', (socket, msg) => {
    console.log(msg)
    console.log(msg.toString())
    console.log(JSON.parse(msg.toString()));
})