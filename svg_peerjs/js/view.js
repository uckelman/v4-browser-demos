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

    this.world = document.querySelector('svg g');
    this._initializeMatrix(this.world);

    this.overlay = document.createElementNS(SVGNS, 'g');
    this._initializeMatrix(this.overlay);
    this.svg.appendChild(this.overlay);

    this.addPiece(model.data.boards[0]);
    this.model.data.pieces.forEach(p => this.addPiece(p));

    this.camera = new Camera();

  }

  _initializeMatrix(e) {
    e.transform.baseVal.appendItem(
      e.transform.baseVal.createSVGTransformFromMatrix(
        // TODO: Switch to DOMMatrix
        this.svg.createSVGMatrix()
      )
    );
  }

  addEventListener(type, listener) {
    this.svg.addEventListener(type, listener);
  }

  removeEventListener(type, listener) {
    this.svg.addEventListener(type, listener);
  }

  hidePointer(uid) {
    let p = document.getElementById(uid);
    if (p !== null) {
      p.parentNode.removeChild(p);
    }
  }

  _createPointer(uid) {
    const mp = document.createElementNS(SVGNS, 'g');
    mp.id = uid;

    const circ1 = document.createElementNS(SVGNS, 'circle');
    circ1.setAttribute('cx', 0);
    circ1.setAttribute('cy', 0);
    circ1.setAttribute('r', 10);
    circ1.style['stroke'] = 'black';
    circ1.style['stroke-width'] = '2px';
    circ1.style['fill'] = 'none';

    const circ2 = document.createElementNS(SVGNS, 'circle');
    circ2.setAttribute('cx', 0);
    circ2.setAttribute('cy', 0);
    circ2.setAttribute('r', 12);
    circ2.style['stroke'] = 'white';
    circ2.style['stroke-width'] = '2px';
    circ2.style['fill'] = 'none';

    const text = document.createElementNS(SVGNS, 'text');
    text.setAttribute('x', 0);
    text.setAttribute('y', 12);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'hanging');
    text.innerHTML = uid; 
    text.style['fill'] = 'black';
    text.style['font-size'] = '8pt';

    mp.appendChild(circ1);
    mp.appendChild(circ2);
    mp.appendChild(text);

    this._initializeMatrix(mp);
    this.overlay.appendChild(mp);
  }

  setPointerLocation(uid, pos) {
    let mp = document.getElementById(uid);

    if (mp === null) {
      this._createPointer(uid);
    }

    const cpos = this.worldToClient(pos);
    mp.transform.baseVal.getItem(0).setTranslate(cpos.x, cpos.y);
  }

  addPiece(piece) {
    const pe = createPieceElement(
      piece['id'],
      'images/' + piece['img'],
      piece['x'],
      piece['y']
    );

    this.world.appendChild(pe);
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
    // TODO: outline should be constant width, not scaled?
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
    this.world.transform.baseVal.getItem(0).setMatrix(m);
  }

  scale(ds, ox, oy) {
    const m = this.camera.scale(ds, ox, oy);
    this.world.transform.baseVal.getItem(0).setMatrix(m);
  }

  rotate(dtheta, ox, oy) {
    const m = this.camera.rotate(dtheta, ox, oy);
    this.world.transform.baseVal.getItem(0).setMatrix(m);
  }

  clientToWorld(p) {
    return this.camera.clientToWorld(p);
  }

  worldToClient(p) {
    return this.camera.worldToClient(p);
  }
}
