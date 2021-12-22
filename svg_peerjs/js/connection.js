import { ListenerSupport } from './listener.js';

export class Connection {
  constructor() {
    this.listeners = {};

    // Create own peer object with connection to shared PeerJS server
    this.peer = new Peer(
      null,
      {
   //    host: 'localhost',
   //    port: 9000,
   //    path: '/',
        debug: 2
      }
    );

//    this.id = null;
    this.connections = new Map();
  }

  start() {
    const scope = this;
    this.peer.on('open', id => {
/*
      // FIXME: is this necessary?
      // Workaround for peer.reconnect deleting previous id
      if (scope.peer.id === null) {
        scope.notify('log', 'Received null id from peer open');
        scope.peer.id = scope.id;
      }
      else {
        scope.id = scope.peer.id;
      }
*/
      scope.notify('p_open', scope.peer.id);
    });

    this.peer.on('close', () => {
      scope.connections.clear();
      scope.notify('p_close', null);
    });

    this.peer.on('error', err => {
      scope.notify('error', err);
    });
  }

  // private
  setupConnection(c) {
    this.connections.set(c.peer, c);

    const scope = this;

    c.on('open', () => {
      scope.notify('open', c.peer);
    });

    c.on('data', data => {
      scope.notify('recv', data);
    });

    c.on('close', () => {
      scope.connections.delete(c.peer);
      scope.notify('close', c.peer);
    });

    this.notify('connected', c.peer);
  }

  listen() {
    const scope = this;

    this.peer.on('connection', c => {
      // Connect only once to each client 
      if (scope.connections.get(c.peer)?.open) {
        c.on('open', () => {
          c.send({
            type: 'error',
            src: scope.peer.id,
            msg: 'Already connected to client ' + c.peer
          });
          setTimeout(() => c.close(), 500);
        });
        return;
      }

      scope.setupConnection(c);
    });

    this.peer.on('disconnected', () => {
      scope.notify('p_disconnected', null);

/*
      // FIXME: is this necessary?
      // Workaround for peer.reconnect deleting previous id
      scope.peer.id = scope.id;
      scope.peer._lastServerId = scope.id;
*/
      scope.peer.reconnect();
    });
  }

  connect(id) {
    // Connect only once to each client 
    if (this.connections.get(id)?.open) {
      this.notify('error', 'Already connected to client ' + id);
      return;
    }

    // Create connection to destination peer specified by id
    const c = this.peer.connect(id, { reliable: true });
    this.setupConnection(c);
  }

  close() {
    this.peer.destroy();
    // TODO: do we need to clear connections here?
  }

  send_or_close(c, data) {
    if (c.open) {
      c.send(data);
    }
    else {
      // TODO: Shouldn't be necessary?
      this.connections.delete(c.peer);
      this.notify('close', c.peer);
    }
  }

  send(data, dst) {
    if (data.src === undefined) {
      data.src = this.peer.id;
    }

    const c = this.connections.get(dst);
    this.send_or_close(c, data);
  }

  send_all(data) {
    if (data.src === undefined) {
      data.src = this.peer.id;
    }

    for (const c of this.connections.values()) {
      this.send_or_close(c, data);
    }
  }
}

Object.assign(Connection.prototype, ListenerSupport);
