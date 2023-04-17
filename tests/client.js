const { Client } = require('../main');

const socket = new Client('ws://localhost:443/hey?username=GTedZ&password=GH');

socket.send('hi');