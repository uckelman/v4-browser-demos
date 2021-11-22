import { loadGame, Model, MoveCommand } from './model.js';
import { View } from './view.js';
import { Controller } from './controller.js';

import { Connection } from './conn.js';
import { Console } from './console.js';

async function init() {
  const msgbox = new Console();
  const postMessage = msg => msgbox.append(msg);

  postMessage("Not connected");

  const params = new URLSearchParams(window.location.search);
  const other_id = params.get('id');

  const conn = new Connection();

  conn.on('log', msg => postMessage(msg));

  conn.on('disconnected', () => {
    postMessage("Connection lost. Please reconnect.");
  });

  conn.on('destroyed', () => {
    postMessage("Connection destroyed. Please refresh.");
  });

  conn.on('error', err => {
    postMesasge("Error: " + err);
  });

  let model = null;
  let view = null; 
  let controller = null; 

  if (other_id) {
    conn.on('peerid', id => {
      postMessage("We are " + id);
      postMessage("Connecting to " + other_id);
      conn.connect(other_id);
    });

    conn.on('close', () => {
      postMessage("Connection closed.");
    });

    conn.on('recv', data => {
      switch (data.type) {
      case 'message':
        postMessage("Them: " + data.text);
        break;

      case 'move':
        model.apply(new MoveCommand(data));
        break; 

      case 'sync':
        postMessage("Synchronizing with peer");
        model = new Model(data.state);
        view = new View(model);
        controller = new Controller(model, view);
    
        model.on('move', cmd => {
          if (cmd.local) {
            cmd.local = false;
            conn.send(cmd);
          }
        });

        break;

      default:
        console.log(data);
      }
    });

    conn.start();
  }
  else {
    conn.on('peerid', id => {
      postMessage("We are " + id);
      postMessage("Awaiting connection...");
    });

    conn.on('close', () => {
      postMessage("Connection reset. Awaiting connection...");
    });

    conn.on('connected', () => {
      postMessage("Connected");
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

    model = new Model(game);
    view = new View(model);
    controller = new Controller(model, view);

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

  msgbox.on('message', msg => {
    conn.send(msg);
  });

  model.on('move', cmd => {
    if (cmd.local) {
      cmd.local = false;
      conn.send(cmd);
    }
  });
}

init();
