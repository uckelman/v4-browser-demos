import { ListenerSupport } from './listener.js';

export class Model {
  constructor(data) {
    this.listeners = {};

    this.data = data;

    const pmap = new Map();
    this.data.pieces.forEach(p => pmap.set(p.id, p));
    this.data.pieces = pmap;
  }

  apply(cmd) {
    cmd.execute(this);
    this.notify(cmd.data.type, cmd.data);
  }

/*
  unapply(cmd) {
    cmd.undo(this);

  }
*/
}

Object.assign(Model.prototype, ListenerSupport);

export class MoveCommand {
  constructor(d) {
    this.data = d;
  }

  static fromPiece(p, nx, ny, nz) {
    return new MoveCommand({
      type: 'move',
      pid: p.id,
      prev_x: p.x,
      prev_y: p.y,
      prev_z: p.z,
      next_x: nx,
      next_y: ny,
      next_z: nz,
    });
  }

  execute(model) {
    const p = model.data.pieces.get(this.data.pid);
    p.x = this.data.next_x;
    p.y = this.data.next_y;
    p.z = this.data.next_z;
  }
  
  undo(model) {
    const p = model.data.pieces.get(this.data.pid);
    p.x = this.data.prev_x;
    p.y = this.data.prev_y;
    p.z = this.data.prev_z;
  }
}

export async function loadGame(url) {
  return JSON.parse(await (await fetch(url)).text());
}
