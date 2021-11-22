import { loadGame, Model, MoveCommand } from './model.js';
import { View } from './view.js';
import { Controller } from './controller.js';

import { Connection } from './conn.js';
import { Console } from './console.js';

async function init() {
  const msgbox = new Console();
  const postMessage = msg => msgbox.append(msg);

  postMessage("Not connected");

  const conn = new Connection();

  conn.on('log', msg => postMessage(msg));

  conn.on('peerid', id => {
    postMessage("We are " + id);
    postMessage("Awaiting connection...");
  });

  conn.on('close', () => {
    postMessage("Connection reset. Awaiting connection...");
  });

  conn.on('disconnected', () => {
    postMessage("Connection lost. Please reconnect.");
  });

  conn.on('destroyed', () => {
    postMessage("Connection destroyed. Please refresh.");
  });

  conn.on('error', err => {
    postMesasge("Error: " + err);
  });

  msgbox.on('message', msg => {
    conn.send(msg);
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

  const model = new Model(game);
  const view = new View(model);
  const controller = new Controller(model, view);

  model.on('move', cmd => {
    if (cmd.local) {
      cmd.local = false;
      conn.send(cmd);
    }
  });

  conn.on('connected', () => {
    postMessage("Connected");
  });

  conn.on('open', _ => {
    postMessage("Sending state");

    const state = {
      boards: model.data.boards,
      pieces: Array.from(model.data.pieces.values())
    };

    conn.send({ type: 'sync', state: state });
  });

  conn.on('recv', data => {
    switch (data.type) {
    case 'message':
      postMessage("Them: " + data.text);
      break;

    case 'move':
      model.apply(new MoveCommand(data));
      break;

    default:
      console.log(data);
    }
  });
}

init();
