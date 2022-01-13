import { ListenerSupport } from './listener.js';


class MoveCommand {
  static apply(model, cmd) {
    const p = model.data.pieces.get(cmd.pid);
    p.x = cmd.next_x;
    p.y = cmd.next_y;
    p.z = cmd.next_z;
  }
  
  static undo(model, cmd) {
    const p = model.data.pieces.get(cmd.pid);
    p.x = cmd.prev_x;
    p.y = cmd.prev_y;
    p.z = cmd.prev_z;
  }
}

export class GameModel {
  constructor(data, meta) {
    this.listeners = {};

    this.meta = meta;

    this.data = data;

    const pmap = new Map();
    this.data.pieces.forEach(p => pmap.set(p.id, p));
    this.data.pieces = pmap;

    const imap = new Map();
    this.data.images.forEach(i => imap.set(i.id, i));
    this.data.images = imap;

    this.commands = {
      move: MoveCommand
    }
  }

  apply(cmd) {
    this.commands[cmd.type].apply(this, cmd);
    this.notify(cmd.type, cmd);
  }

/*
  unapply(cmd) {
    this.commands[cmd.type].undo(this);
  }
*/
}

Object.assign(GameModel.prototype, ListenerSupport);

export async function loadGame(url) {
  return JSON.parse(await (await fetch(url)).text());
}
