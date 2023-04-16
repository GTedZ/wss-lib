const { Server, Client } = require('../main');

const server = new Server();

server.listen(443, () => console.log('server is active'));

server.on('authentication', (request, tempSocket) => {
    const customURL = `ws://ignore${request.url}`;
    const URL2 = new URL(customURL);

    const username = URL2.searchParams.get('username');
    const password = URL2.searchParams.get('password');

    if (!username || !password) {
        return false;           // REJECT connection
    }

    tempSocket.once('accepted', newSocket => {
        newSocket.username = username;
        newSocket.password = password;
    })


    return true;                // ACCEPT connection
})

server.on('message', (socket, msg) => {
    const data = msg.toString();

    console.log(socket.username, socket.password, 'got a message from those creds:', data);
})