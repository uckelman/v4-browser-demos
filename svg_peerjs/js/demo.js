import { loadGame, Model, MoveCommand } from './model.js';
import { View } from './view.js';
import { Controller } from './controller.js';

import { Connection } from './connection.js';
import { ConsoleController, ConsoleView } from './console.js';

function makeMVC(state) {
  const model = new Model(state);
  const view = new View(model);
  const controller = new Controller(model, view);
  return [model, view, controller];
}

function setupMVC(model, view, controller, conn, name) {
  model.on('move', cmd => {
    if (cmd.src === undefined) {
      conn.send_all(cmd);
    }
  });

  model.on('move', cmd => {
    view.updatePiece(cmd.pid, ['x', 'y', 'z']);
  });

  controller.on('lock', pid => {
    conn.send_all({ type: 'lock', pid: pid });
  }); 

  controller.on('unlock', pid => {
    conn.send_all({ type: 'unlock', pid: pid });
  });

  controller.on('mpos', pos => {
    conn.send_all({ type: 'mpos', name: name, x: pos.x, y: pos.y });
  });

/*
  controller.on('menter', pos => {
    conn.send_all({ type: 'menter' });
  });
*/

  controller.on('mleave', pos => {
    conn.send_all({ type: 'mleave', name: name });
  });
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

  let model = null;
  let view = null; 
  let controller = null; 

  const message_handlers = {
    message: cmd => postMessage(cmd.name + ": " + cmd.text),
    move: cmd => model.apply(new MoveCommand(cmd)),
    sync: cmd => {
      postMessage("Synchronizing with peer " + cmd.src);
      [model, view, controller] = makeMVC(cmd.state);
      setupMVC(model, view, controller, conn, name);
    },
    lock: cmd => controller.lock(cmd.pid),
    unlock: cmd => controller.unlock(cmd.pid),
    mpos: cmd => view.setPointerLocation(cmd.name, new DOMPoint(cmd.x, cmd.y)),
    mleave: cmd => view.hidePointer(cmd.name)
  };

  if (remote_id) {
    // client: connect to server 
    conn.on('p_open', id => {
      postMessage("We are " + id);
      postMessage("Connecting to " + remote_id);
      conn.connect(remote_id);
    });

    conn.on('recv', cmd => {
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

    const game = await loadGame('game.json');

    game.pieces.forEach((p, i) => {
      p['id'] = `${i}`;
      p['x'] = window.innerWidth * Math.random();
      p['y'] = window.innerHeight * Math.random();
      p['z'] = 0;
    });

    [model, view, controller] = makeMVC(game);
    setupMVC(model, view, controller, conn, name);

    conn.on('open', id => {
      postMessage("Sending state to " + id);

      const state = {
        boards: model.data.boards,
        pieces: Array.from(model.data.pieces.values())
      };

      conn.send({ type: 'sync', state: state }, id);
    });

    conn.on('recv', cmd => {
      conn.send_all(cmd);
      (message_handlers[cmd.type] || console.log)(cmd);
    });
  }

  consoleCtrl.on('message', cmd => {
    conn.send_all(cmd);
  });

  consoleCtrl.on('message', cmd => {
    consoleView.append(cmd.name + ": " + cmd.text);
  });
}

init();
