const { Server } = require('../main');

const server = new Server();

server.listen(443, () => console.log('server is active'));

server.on('authentication', (request, tempSocket) => {
    const searchParams = server.getSearchParams(request);

    const username = searchParams.get('username');
    const password = searchParams.get('password');

    if (!username || !password) {
        return false;           // REJECT connection
    }

    tempSocket.once('accepted', newSocket => {
        newSocket.username = username;
        newSocket.password = password;
        setInterval(() => newSocket.send('hello'), 1000)
    })


    return true;                // ACCEPT connection
})

server.on('message', (socket, msg) => {
    const data = msg.toString();

    console.log(socket.username, socket.password, 'got a message from those creds:', data);
})

server.on('privateMessage', (socket, msg, msg_id) => {
    // handle message
    return 'OK';
})