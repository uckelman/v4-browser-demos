import { loadGame, GameModel } from './gamemodel.js';

import { SurfaceView } from './surfaceview.js';
import { SurfaceController } from './surfacecontroller.js';
import { SurfaceUI } from './surfaceui.js';

import { ConsoleController, ConsoleView } from './console.js';

import { Connection } from './connection.js';

//import { Dispatcher } from './dispatcher.js';

function makeComponents(state, conn, name) {
  const gmodel = new GameModel(state);

  const smodel = {name: name};
  const sview = new SurfaceView(gmodel);
  const scontroller = new SurfaceController(gmodel, smodel, sview);
  const sui = new SurfaceUI(smodel, sview, scontroller);

  gmodel.on('move', cmd => {
    sui.view.updatePiece(cmd.pid, ['x', 'y', 'z']);
  });

/*
  sui.controller.on('move', cmd => {
    conn.send_all(cmd);
    gmodel.apply(cmd);
  });
*/

  sui.controller.on('lock', cmd => {
    conn.send_all(cmd);
  }); 

  sui.controller.on('unlock', cmd => {
    conn.send_all(cmd);
  });

  sui.controller.on('mpos', cmd => {
    conn.send_all(cmd);
  });

  sui.controller.on('mleave', cmd => {
    conn.send_all(cmd);
  });

  return [gmodel, sui];
}

async function init() {
  const params = new URLSearchParams(window.location.search);
  const remote_id = params.get('id');
  const name = params.get('name');

  const consoleCtrl = new ConsoleController(name);
  const consoleView = new ConsoleView(name);
  const postMessage = msg => consoleView.append(msg);

  postMessage("Not connected");

  const conn = new Connection();

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

  const message_handlers = {
    message: cmd => postMessage(cmd.name + ": " + cmd.text),
    move: cmd => gmodel.apply(cmd),
    sync: cmd => {
      postMessage("Synchronizing with peer " + cmd.src);
      [gmodel, sui] = makeComponents(cmd.state, conn, name);

      const server_id = cmd.src;
      sui.controller.on('move', cmd => {
        conn.send(cmd, server_id);
      });

      consoleCtrl.on('message', cmd => {
        conn.send(cmd, server_id);
      });
    },
    lock: cmd => {
      if (cmd.src !== conn.peer.id) {
        sui.controller.lock(cmd.pid);
      }
    },
    unlock: cmd => {
      if (cmd.src !== conn.peer.id) {
        sui.controller.unlock(cmd.pid);
      }
    },
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

//  const dispatcher = new Dispatcher(message_handlers);

  if (remote_id) {
    // client: connect to server 
    conn.on('p_open', id => {
      postMessage("We are " + id);
      postMessage("Connecting to " + remote_id);
      conn.connect(remote_id);
    });

    conn.on('recv', cmd => {
//      console.log(cmd);
      (message_handlers[cmd.type] || console.log)(cmd);
    });

    conn.start();
  }
  else {
    // server: listen for connection
    conn.on('p_open', id => {
      postMessage("We are " + id);
      postMessage(`Connect to ${window.location.protocol}//${window.location.host}${window.location.pathname}?id=${id}`);
      postMessage("Awaiting connection...");
    });

    conn.start();
    conn.listen();

    const state = await loadGame('game.json');

    state.pieces.forEach((p, i) => {
      p['id'] = `${i}`;
      p['x'] = window.innerWidth * Math.random();
      p['y'] = window.innerHeight * Math.random();
      p['z'] = 0;
    });

    [gmodel, sui] = makeComponents(state, conn, name);

    sui.controller.on('move', cmd => {
      conn.send_all(cmd);
      gmodel.apply(cmd);
    });

    consoleCtrl.on('message', cmd => {
      conn.send_all(cmd);
      consoleView.append(cmd.name + ": " + cmd.text);
    });

    conn.on('open', id => {
      postMessage("Sending state to " + id);

      const state = {
        boards: gmodel.data.boards,
        pieces: Array.from(gmodel.data.pieces.values())
      };

      conn.send({ type: 'sync', state: state }, id);
    });

    conn.on('recv', cmd => {
      conn.send_all(cmd);
      (message_handlers[cmd.type] || console.log)(cmd);
    });
  }
}

init();
