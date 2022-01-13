import { init } from './init.js';

async function start() {
  const params = new URLSearchParams(window.location.search);
  let remote_id = params.get('id');
  const name = params.get('name');

  init(remote_id, name, 'afrika_ii');
//  init(remote_id, name, 'cards');
}

start();
