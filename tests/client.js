const Client = require('../Client/Client');

const socket = new Client('ws://localhost:443/hey?username=GTedZ&password=GH');

socket.send('hi')