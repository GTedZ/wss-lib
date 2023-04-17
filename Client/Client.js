const EventEmitter = require('events');
const ws = require('ws');

const SECOND = 1000,
    MINUTE = 60 * SECOND;
;

const delay = (ms) => new Promise(r => setTimeout(r, ms));

class Client extends EventEmitter {

    lastPong_timestamp;

    setInterval_cb;

    alive = true;

    timeout = 500;

    pingInterval_time = 3 * MINUTE;

    pong_timeout_limit = 15 * MINUTE;

    socket;

    path;

    params;

    constructor(path, params = {}) {
        super();
        this.setPath(path);
        this.setParams(params);

        this.newSocket();

        start_ping_interval(this);
    }

    setPath(path) {
        if (typeof path != 'string') throw new Error(`'path' must be of type 'String'`);
        this.path = path;
    }

    setParams(params) {
        this.params = params;
    }

    newSocket() {
        let path = this.path;
        if (isObject(this.params) && Object.keys(this.params).length > 0) {
            path += '?';

            for (const [key, value] of Object.entries(this.params)) {
                path += key + '=' + value;
            }

        }
        path = encodeURI(path);
        this.socket = new ws.WebSocket(path);

        this.socket.on('open', (...args) => {
            this.lastPong_timestamp = Date.now();
            this.emit('open', ...args);
        });

        this.socket.on('error', (...args) => {
            if (!this.alive) return;

            if (this.listenerCount('error') != 0) this.emit('error', ...args);
        });

        this.socket.on('close', async (...args) => {
            if (!this.alive) return;
            await delay(this.timeout);
            this.newSocket();
            this.emit('close', ...args);
        });

        this.socket.on('message', (...args) => {
            if (!this.alive) return;
            this.emit('message', ...args);
        });

        this.socket.on('ping', (...args) => {
            if (!this.alive) return;
            this.emit('ping', ...args);
        })

        this.socket.on('pong', (...args) => {
            if (!this.alive) return;
            this.lastPong_timestamp = Date.now();
            this.emit('pong', ...args);
        })
    }

    pong() {
        if (!this.alive) return;
        if (this.socket.readyState !== ws.OPEN) setTimeout(() => this.ping(), this.timeout);
        else this.socket.pong();
    }

    ping() {
        if (!this.alive) return;
        if (this.socket.readyState !== ws.OPEN) setTimeout(() => this.ping(), this.timeout);
        else this.socket.ping();
    }

    close() {
        clearInterval(this.setInterval_cb);
        this.alive = false;
        this.socket?.close();
    }

    async send(msg) {
        if (!this.alive) return;

        if (this.socket.readyState !== ws.OPEN) {
            await delay(this.timeout);
            return this.send(msg);
        }

        if (typeof msg == 'object') msg = JSON.stringify(msg);

        await this.socket.send(msg);
    }

}

function isObject(value) {
    return (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value)
    );
}

function start_ping_interval(clientInstance) {
    clientInstance.setInterval_cb = setInterval(() => {
        if (Date.now() - clientInstance.lastPong_timestamp >= clientInstance.pong_timeout_limit) {
            clientInstance.newSocket();
        } else {
            clientInstance.ping();
        }
    }, clientInstance.pingInterval_time);
}

module.exports = Client;