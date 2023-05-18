const { Client } = require('../main');

const socket = new Client('ws://localhost:9000/hey', { username: 'GTedZ', password: 'hello' });
