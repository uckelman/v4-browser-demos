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

    this.lastPeerId = null;
    this.conn = null;
  }

  start() {
    const scope = this;

    this.peer.on('open', id => {
      // Workaround for peer.reconnect deleting previous id
      if (scope.peer.id === null) {
        console.log('Received null id from peer open');
        scope.peer.id = scope.lastPeerId;
      }
      else {
        scope.lastPeerId = scope.peer.id;
      }

      console.log('We are ' + scope.peer.id);
      scope.notify('peerid', scope.peer.id);
    });
  }

  listen() {
    const scope = this;

    this.peer.on('connection', c => {
      // Allow only a single connection
      if (scope.conn && scope.conn.open) {
        c.on('open', function() {
          c.send({ type: 'error', msg: 'Already connected to another client' });
          setTimeout(() => c.close(), 500);
        });
        return;
      }

      scope.conn = c;
      console.log("Connected to " + scope.conn.peer);
      scope.notify('connected', null);

      scope.conn.on('data', data => {
        console.log("Recv: " + data);
        scope.notify('recv', data);
      });

      scope.conn.on('close', () => {
        scope.notify('close', null);
        scope.conn = null;
      });
    });

    this.peer.on('disconnected', () => {
      scope.notify('disconnected', null);
      console.log('Connection lost. Please reconnect');

      // Workaround for peer.reconnect deleting previous id
      scope.peer.id = scope.lastPeerId;
      scope.peer._lastServerId = scope.lastPeerId;
      scope.peer.reconnect();
    });

    this.peer.on('close', () => {
      scope.conn = null;
      scope.notify('destroyed', null);
      console.log('Connection destroyed');
    });

    this.peer.on('error', err => {
      console.log(err);
      scope.notify('error', err);
    });
  }

  connect(id) {
    const scope = this;

    this.peer.on('connection', c => {
      // Disallow incoming connections
      c.on('open', () => {
        c.send({ type: 'error', msg: "Sender does not accept incoming connections"});
        setTimeout(() => c.close(), 500);
      });
    });

    // Close old connection
    if (this.conn) {
      this.conn.close();
    }

    // Create connection to destination peer specified by id
    this.conn = this.peer.connect(id, { reliable: true });

    this.conn.on('open', () => {
      scope.notify('open', scope.conn.peer); 
      console.log("Connected to: " + scope.conn.peer);
    });  

    // Handle incoming data (messages only since this is the signal sender)
    this.conn.on('data', data => {
      console.log("Recv: " + data);
      scope.notify('recv', data);
    });

    this.conn.on('close', () => {
      scope.notify('close', null);
      scope.conn = null;
    });
  }

  close() {
    this.peer.destroy();
  }

  send(msg) {
    if (this.conn && this.conn.open) {
      this.conn.send(msg);
      console.log("Send: " + msg)
    }
    else {
      console.log('Connection is closed');
    }
  }

  on(type, listener) {
    if (!(type in this.listeners)) {
      this.listeners[type] = [];
    }
    this.listeners[type].push(listener);
  }

  off(type, listener) {
    const ll = this.listeners[type];
    if (ll) {
      const i = ll.indexOf(listener);
      if (i >= 0) {
        ll.splice(i, 1);
      }
    }
  }

  notify(type, msg) {
    const ll = this.listeners[type];
    if (ll) {
      for (const l of ll) {
        l(msg);
      }
    }
  }
}
