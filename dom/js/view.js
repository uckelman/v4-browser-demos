import { Camera } from './camera.js';

function matrix(a, b, c, d, e, f) {
  return `matrix(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`; 
}

function createPieceElement(id, img_url, x, y) {
  const img = document.createElement('img');
  img.setAttribute('src', img_url);
  
  const div = document.createElement('div');
  div.id = id;
  div.style.left = `${x}px`;
  div.style.top = `${y}px`;
  div.appendChild(img);

  return div;  
}

export class View {
  constructor(game) {
    this.game = game;

    this.world = document.getElementById('world');

    this.g = document.querySelector('div div');
    this.g.style.position = 'relative';

    this.addPiece(game['boards'][0]);
    this.game['pieces'].forEach(p => this.addPiece(p));

    this.camera = new Camera();
  
    // Initialize the transformation matrix on the group ("g") element
    this.g.style.transform = matrix(1, 0, 0, 1, 0, 0);
  }

  addEventListener(type, listener) {
    this.world.addEventListener(type, listener);
  }
 
  removeEventListener(type, listener) {
    this.world.removeEventListener(type, listener);
  }

  addPiece(piece) {
    const pe = createPieceElement(
      piece['id'],
      'images/' + piece['img'],
      piece['x'],
      piece['y']
    );

    this.g.appendChild(pe);
  }

  removePiece(piece) {
  }

  updatePiece(piece, updated) {
    const pe = document.getElementById(piece['id']);

    for (const prop of updated) {
      if (prop == 'x') {
        pe.style.left = `${piece['x']}px`;
      }
      else if (prop == 'y') {
        pe.style.top = `${piece['y']}px`;
      }
    }
  }

  selectPiece(piece) {
    const pe = document.getElementById(piece['id']);
    pe.parentNode.appendChild(pe);
    pe.style.outline = '2px solid black';
  }
  
  deselectPiece(piece) {
    const pe = document.getElementById(piece['id']);
    pe.style.outline = null;
  }

  pieceIdFor(e) {
    return e.target.parentElement.id;
  }

  translate(dx, dy) {
    const m = this.camera.translate(dx, dy);
    this.g.style.transform = matrix(m.a, m.b, m.c, m.d, m.e, m.f);
  }

  scale(ds, ox, oy) {
    const m = this.camera.scale(ds, ox, oy);
    this.g.style.transform = matrix(m.a, m.b, m.c, m.d, m.e, m.f);
  }

  rotate(dtheta, ox, oy) {
    const m = this.camera.rotate(dtheta, ox, oy);
    this.g.style.transform = matrix(m.a, m.b, m.c, m.d, m.e, m.f);
  }

  clientToView(p) {
    return this.camera.clientToView(p);
  }
}
