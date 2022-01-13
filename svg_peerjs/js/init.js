import { loadGame, GameModel } from './gamemodel.js';

import { ConsoleController, ConsoleView, ConsoleUI } from './console.js';

import { SurfaceView } from './surfaceview.js';
import { SurfaceController } from './surfacecontroller.js';
import { SurfaceUI } from './surfaceui.js';

import { Connection } from './connection.js';

import { Client } from './client.js';
import { Server } from './server.js';

export async function init(remote_id, name, gamedir) {
  if (!remote_id) {
    // start the server if we host it
    
    const state = await loadGame(gamedir + '/game.json');

    state.pieces.forEach((p, i) => {
      p['id'] = `${i}`;
      p['x'] = window.innerWidth * Math.random();
      p['y'] = window.innerHeight * Math.random();
      p['z'] = 0;
    });

    const meta = {
      basedir: gamedir
    };

    const model = new GameModel(state, meta);
    const sconn = new Connection();
    const loc = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;

    const server = new Server(model, loc, sconn);
    remote_id = await server.run();
  }

  const cconn = new Connection();

  const consoleCtrl = new ConsoleController(name);
  const consoleView = new ConsoleView(name);
  const consoleui = new ConsoleUI(consoleView, consoleCtrl);

  const surfaceuiFactory = (gmodel, smodel) => {
    const sview = new SurfaceView(gmodel);
    const scontroller = new SurfaceController(gmodel, smodel, sview);
    return new SurfaceUI(smodel, sview, scontroller);
  };

  const client = new Client(remote_id, name, consoleui, surfaceuiFactory, cconn);
  client.run();
}
