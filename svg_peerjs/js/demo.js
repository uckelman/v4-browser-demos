import { loadGame, GameModel } from './gamemodel.js';

import { Connection } from './connection.js';
import { Client } from './client.js';
import { Server } from './server.js';

async function init() {
  const params = new URLSearchParams(window.location.search);
  let remote_id = params.get('id');
  const name = params.get('name');

  if (!remote_id) {
    // start the server if we host it
    const state = await loadGame('game.json');

    state.pieces.forEach((p, i) => {
      p['id'] = `${i}`;
      p['x'] = window.innerWidth * Math.random();
      p['y'] = window.innerHeight * Math.random();
      p['z'] = 0;
    });

    const model = new GameModel(state);
    const sconn = new Connection();
    const loc = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;

    const server = new Server(model, loc, sconn);
    remote_id = await server.run();
  }

  const cconn = new Connection();
  const client = new Client(remote_id, name, cconn);
  client.run();
}

init();
