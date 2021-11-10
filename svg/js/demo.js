import { loadGame } from './model.js';
import { View } from './view.js';
import { Controller } from './controller.js';

async function init() {

  const game = await loadGame('game.json');

  game['pieces'].forEach((p, i) => {
    p['id'] = `${i}`;
    p['x'] = window.innerWidth * Math.random();
    p['y'] = window.innerHeight * Math.random();
  });

  const view = new View(game);
  const controller = new Controller(game, view);
}

init();
