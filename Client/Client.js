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

    privateMessage_timeout = 10 * SECOND;

    /**
     * @type {ws.WebSocket | null}
     */
    socket = null;

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
        if (this.socket !== null) this.socket.close();

        let path = this.path;
        if (isObject(this.params) && Object.keys(this.params).length > 0) {
            path += '?';

            const params = [];
            for (const [key, value] of Object.entries(this.params)) params.push(key + '=' + value);
            path += params.join('&');
        }

        path = encodeURI(path);
        this.socket = new ws.WebSocket(path);

        this.socket.on('open', (...args) => {
            this.lastPong_timestamp = Date.now();
            this.emit('open', ...args);
        });

        this.socket.on('error', (...args) => {
            if (!this.alive) return;

            if (this.listenerCount('error') != 0) this.emit('error', ...args);  // needed to check the listenerCount or else an actual unhandled `new Error` exception will be thrown.
        });

        this.socket.on('close', async (...args) => {
            if (!this.alive) return;
            await delay(this.timeout);
            this.newSocket();
            this.emit('close', ...args);
        });

        this.socket.on('message', (message) => {
            if (!this.alive) return;
            message = message.toString();

            if (this.listenerCount('privateMessage') === 0) {
                return this.emit('message', message);
            }

            try {
                const { ws_message_id, ws_message } = JSON.parse(message);
                if (!ws_message_id || !ws_message) throw '';
                this.emit('privateMessage', ws_message_id, ws_message);
            } catch (err) {
                this.emit('message', message);
            }

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

        if (typeof msg === 'object') msg = JSON.stringify(msg);

        await this.socket.send(msg);
    }

    async sendPrivateMessage(msg) {
        if (typeof msg === 'object') msg = JSON.stringify(msg);

        return new Promise(
            async (resolve, reject) => {
                const ID = Math.random() * 1000000000

                let callback = (ws_message_id, ws_message) => {
                    if (ws_message_id !== ID) return;
                    this.off('privateMessage', callback);
                    resolve(ws_message);
                }
                this.on('privateMessage', callback);
                setTimeout(() => {
                    this.off('privateMessage', callback);
                    reject(`No response within ${this.privateMessage_timeout / 1000} seconds received`);
                }, this.privateMessage_timeout);

                this.send({
                    ws_message_id: ID,
                    ws_message: msg
                })

            }
        );
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