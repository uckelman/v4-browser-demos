import { GameModel } from './gamemodel.js';

import { LamportClock } from './lamportclock.js';


export class Client {
  constructor(server_id, name, consoleui, surfaceuiFactory, conn) {
    const postMessage = msg => consoleui.view.append(msg);

    postMessage("Not connected");

    this.conn = conn;

    conn.on('log', msg => postMessage(msg));

    conn.on('p_disconnected', () => {
      postMessage("Connection lost. Please reconnect.");
    });

    conn.on('p_closed', () => {
      postMessage("Connection closed. Please refresh.");
    });

    conn.on('error', err => {
      postMessage("Error: " + err);
    });

    conn.on('connected', id => {
      postMessage("Connected to " + id);
    });

    conn.on('close', id => {
      postMessage('Connection to ' + id + ' closed.');
    });

    const clock = new LamportClock();
    const send = (cmd, remote_id) => {
      cmd.time = clock.tick();
      conn.send(cmd, remote_id);
    };

    let gmodel = null;
    let sui = null; 
    let uistate = { name: name };

    const message_handlers = {
      message: cmd => {
        if (cmd.name) {
          postMessage(cmd.name + ": " + cmd.text);
        }
        else {
          postMessage(cmd.text);
        }
      },
      move: cmd => {
        clock.tick(cmd.time);
        gmodel.apply(cmd);
      },
      sync: cmd => {
        const server_id = cmd.src;
        postMessage("Synchronizing with server " + server_id);

        // set up client infrastructure
// TODO: factory
        gmodel = new GameModel(cmd.state, cmd.meta);
        sui = surfaceuiFactory(gmodel, uistate);

        // commands affecting game state

        gmodel.on('move', cmd => {
          sui.view.updatePiece(cmd.pid, ['x', 'y', 'z']);
        });

        sui.controller.on('move', cmd => {
          send(cmd, server_id);
          gmodel.apply(cmd);
        });

        // logged commands

        consoleui.controller.on('message', cmd => {
          conn.send(cmd, server_id);
        });

        // ephemeral commands

        consoleui.controller.on('nick', cmd => {
          console.log(cmd);
          sui.controller.uimodel.name = cmd.name;
        });

        sui.controller.on('mpos', cmd => {
          conn.send(cmd, server_id);
        });

        sui.controller.on('mleave', cmd => {
          conn.send(cmd, server_id);
        });

         sui.controller.on('try_lock', cmd => {
          conn.send(cmd, server_id);
        });

        sui.controller.on('unlock', cmd => {
          conn.send(cmd, server_id);
        });
      },
      lock: cmd => sui.controller.lock(cmd.pid, cmd.uid),
      unlock: cmd => sui.controller.unlock(cmd.pid),
      mpos: cmd => {
        if (cmd.src !== conn.peer.id) {
          sui.view.setPointerLocation(cmd.name, new DOMPoint(cmd.x, cmd.y));
        }
      },
      mleave: cmd => {
        if (cmd.src !== conn.peer.id) {
          sui.view.hidePointer(cmd.name);
        }
      }
    };

    // connect to server 
    conn.on('p_open', id => {
      postMessage("We are " + id);
      postMessage("Connecting to " + server_id);
      conn.connect(server_id);
      uistate.uid = id;
    });

    const noop = _ => {};

    conn.on('recv', cmd => {
      console.log(cmd);
      (message_handlers[cmd.type] || noop)(cmd);
    });
  }

  run() {
    this.conn.start(); 
  }
}
