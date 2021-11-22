import { loadGame, Model } from './model.js';
import { View } from './view.js';
import { Controller } from './controller.js';

async function init() {

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
}

init();
