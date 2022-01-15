import { init } from './init.js';

async function start() {
  const params = new URLSearchParams(window.location.search);

  const remote_id = params.get('id');
  const name = params.get('name');
  const game = params.get('game');

  init(remote_id, name, game);
}

start();
