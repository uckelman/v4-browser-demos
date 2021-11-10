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
  constructor(game) {
    this.game = game;

    this.svg = document.querySelector('svg');
    this.g = document.querySelector('svg g');

    this.addPiece(game['boards'][0]);
    this.game['pieces'].forEach(p => this.addPiece(p));

    this.camera = new Camera();

    // Initialize the transformation matrix on the group ("g") element
    this.g.transform.baseVal.appendItem(
      this.g.transform.baseVal.createSVGTransformFromMatrix(
        new DOMMatrix()
      )
    );
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

  updatePiece(piece, updated) {
    const pe = document.getElementById(piece['id']);

    for (const prop of updated) {
      if (prop == 'x') {
        pe.x.baseVal.value = piece['x'];
      }
      else if (prop == 'y') {
        pe.y.baseVal.value = piece['y'];
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

  clientToView(p) {
    return this.camera.clientToView(p);
  }
}

const RAD_TO_DEG = 180 / Math.PI;

class Camera {
  constructor() {
    this.m = new DOMMatrix();
    this.m_inv = null;
  }

   scale(ds, ox, oy) {
     this.m = new DOMMatrix()
                  .translate(ox, oy)
                  .scale(ds)
                  .translate(-ox, -oy)
                  .multiply(this.m);
    this.m_inv = null;
    return this.m;
  }

  translate(dx, dy) {
    this.m = new DOMMatrix()
                 .translate(dx, dy)
                 .multiply(this.m);
    this.m_inv = null;
    return this.m;
  }

  rotate(dtheta, ox, oy) {
    // NB: these barbarians use degrees
    this.m = new DOMMatrix()
                 .translate(ox, oy)
                 .rotate(dtheta * RAD_TO_DEG)
                 .translate(-ox, -oy)
                 .multiply(this.m);
    this.m_inv = null;
    return this.m;
  }

  clientToView(p) {
    if (this.m_inv === null) {
      this.m_inv = this.m.inverse();
    }
    return p.matrixTransform(this.m_inv);
  }
}
