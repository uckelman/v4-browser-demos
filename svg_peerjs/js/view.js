import { Camera } from './camera.js';

const SVGNS = 'http://www.w3.org/2000/svg';

function createPieceElement(id, img_url, x, y) {
  const img = document.createElementNS(SVGNS, 'image');
  img.id = id;
  img.setAttribute('href', img_url);
  img.setAttribute('x', x);
  img.setAttribute('y', y);
  return img;
}

export class View {
  constructor(model) {
    this.model = model;

    this.svg = document.querySelector('svg');
    this.g = document.querySelector('svg g');

    this.addPiece(model.data.boards[0]);
    this.model.data.pieces.forEach(p => this.addPiece(p));

    this.camera = new Camera();

    // Initialize the transformation matrix on the group ("g") element
    this.g.transform.baseVal.appendItem(
      this.g.transform.baseVal.createSVGTransformFromMatrix(
        // TODO: Switch to DOMMatrix
        this.svg.createSVGMatrix()
      )
    );

    this.model.on('move', cmd => {
      this.updatePiece(cmd.pid, ['x', 'y', 'z']);
    });
  }

  addEventListener(type, listener) {
    this.svg.addEventListener(type, listener);
  }

  removeEventListener(type, listener) {
    this.svg.addEventListener(type, listener);
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

  updatePiece(pid, updated) {
    const p = this.model.data.pieces.get(pid);
    const pe = document.getElementById(pid);

    for (const prop of updated) {
      if (prop === 'x') {
        pe.x.baseVal.value = p.x;
      }
      else if (prop === 'y') {
        pe.y.baseVal.value = p.y;
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
    return e.target.id;
  }

  translate(dx, dy) {
    const m = this.camera.translate(dx, dy);
    this.g.transform.baseVal.getItem(0).setMatrix(m);
  }

  scale(ds, ox, oy) {
    const m = this.camera.scale(ds, ox, oy);
    this.g.transform.baseVal.getItem(0).setMatrix(m);
  }

  rotate(dtheta, ox, oy) {
    const m = this.camera.rotate(dtheta, ox, oy);
    this.g.transform.baseVal.getItem(0).setMatrix(m);
  }

  clientToWorld(p) {
    return this.camera.clientToWorld(p);
  }
}
