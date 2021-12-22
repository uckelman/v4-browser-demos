import { GameModel } from './gamemodel.js';

import { SurfaceView } from './surfaceview.js';
import { SurfaceController } from './surfacecontroller.js';
import { SurfaceUI } from './surfaceui.js';

import { ConsoleController, ConsoleView } from './console.js';


export class Client {
  constructor(server_id, name, conn) {
    const consoleCtrl = new ConsoleController(name);
    const consoleView = new ConsoleView(name);
    const postMessage = msg => consoleView.append(msg);

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
      move: cmd => gmodel.apply(cmd),
      sync: cmd => {
        postMessage("Synchronizing with server " + cmd.src);

        gmodel = new GameModel(cmd.state);

        const smodel = uistate;
        const sview = new SurfaceView(gmodel);
        const scontroller = new SurfaceController(gmodel, smodel, sview);

        sui = new SurfaceUI(smodel, sview, scontroller);

        gmodel.on('move', cmd => {
          sui.view.updatePiece(cmd.pid, ['x', 'y', 'z']);
        });

        sui.controller.on('unlock', cmd => {
          conn.send(cmd, server_id);
        });

        sui.controller.on('mpos', cmd => {
          conn.send(cmd, server_id);
        });

        sui.controller.on('mleave', cmd => {
          conn.send(cmd, server_id);
        });

        const server_id = cmd.src;
        sui.controller.on('move', cmd => {
          conn.send(cmd, server_id);
          gmodel.apply(cmd);
        });
    
        sui.controller.on('try_lock', cmd => {
          conn.send(cmd, server_id);
        });
   
        consoleCtrl.on('message', cmd => {
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

    conn.on('recv', cmd => {
  //      console.log(cmd);
      (message_handlers[cmd.type] || console.log)(cmd);
    });
  }

  run() {
    this.conn.start(); 
  }
}
