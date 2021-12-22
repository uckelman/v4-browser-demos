export class Server {
  constructor(model, loc, conn) {

    this.model = model;
    this.conn = conn;

    this._locks = new Map();

    const locks = this._locks;

    conn.on('p_disconnected', () => {
      console.log("Connection lost. Please reconnect.");
    });

    conn.on('p_closed', () => {
      console.log("Connection closed. Please refresh.");
    });

    conn.on('error', err => {
      console.log("Error: " + err);
    });

    conn.on('connected', id => {
      console.log("Connected to " + id);
    });

    conn.on('close', id => {
      console.log('Connection to ' + id + ' closed.');
    });

    this.ready = new Promise(resolve => {
      conn.on('p_open', id => {
        console.log("We are " + id);
        resolve(id);
      });
    });

    conn.on('open', id => {
      console.log("Sending state to " + id);

      const state = {
        boards: model.data.boards,
        pieces: Array.from(model.data.pieces.values())
      };

      conn.send({ type: 'sync', state: state }, id);
      conn.send({ type: 'message', text: `Connect to ${loc}?id=${conn.peer.id}` }, id);
    });

    const message_handlers = {
      move: cmd => model.apply(cmd),
      try_lock: cmd => {
        if (!locks.has(cmd.pid)) {
          locks.set(cmd.pid, cmd.src);
          conn.send_all({ type: 'lock', pid: cmd.pid, uid: cmd.src });
        }
      },
      unlock: cmd => locks.delete(cmd.pid)
    };

    const noop = _ => {};

    conn.on('recv', cmd => {
      console.log(cmd);
      conn.send_all(cmd);
      (message_handlers[cmd.type] || noop)(cmd);
    });
  }

  run() {
    this.conn.start();
    this.conn.listen();
    return this.ready;
  }
}
