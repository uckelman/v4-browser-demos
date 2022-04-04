import { Camera } from './camera.js';

const SVGNS = 'http://www.w3.org/2000/svg';
const XLINKNS = 'http://www.w3.org/1999/xlink';

async function dimensionsOf(img_url) {
  const img = new Image();
  const p = new Promise(resolve => img.addEventListener('load', resolve));
  img.src = img_url;
  await p;
  return {
    width: img.naturalWidth,
    height: img.naturalHeight
  };
}

function createImageAsset(id, img_url) {
  return img_url.endsWith('.svg') ?
    createImageAssetSVG(id, img_url) :
    createImageAssetBitmap(id, img_url);
}

function createImageAssetBitmap(id, img_url) {
  const img = document.createElementNS(SVGNS, 'image');
  const symbol = document.createElementNS(SVGNS, 'symbol');
  symbol.id = id;
  symbol.appendChild(img);

  const p = new Promise(resolve => img.addEventListener('load', resolve))
    .then(() => { return dimensionsOf(img_url); })
    .then(d => {
      img.setAttribute('width', d.width);
      img.setAttribute('height', d.height);
      symbol.setAttribute('width', d.width);
      symbol.setAttribute('height', d.height);
    });

  img.setAttribute('href', img_url);

  return [symbol, p];
}

function createImageAssetSVG(id, img_url) {
  const symbol = document.createElementNS(SVGNS, 'symbol');
  symbol.id = id;

  const base_url = img_url.substring(0, img_url.lastIndexOf('/'));

  const p = fetch(img_url)
    .then(response => response.text())
    .then(data => {
      // load the SVG
      const parser = new DOMParser();
      const doc = parser.parseFromString(data, 'image/svg+xml');
      const svg = doc.querySelector('svg');

      // fix up relative hrefs
      // TODO: also modify regular href? probably need to handle both
      [].slice.call(svg.querySelectorAll("[*|href]"))
        .filter(
            e => !e.getAttribute('xlink:href').startsWith('#') &&
                 !e.getAttribute('xlink:href').startsWith('data:')
        )
        .forEach(e => e.setAttributeNS(
          XLINKNS,
          'xlink:href',
          base_url + '/' + e.getAttribute('xlink:href')
        )
      );

      symbol.setAttribute('width', svg.getAttribute('width'));
      symbol.setAttribute('height', svg.getAttribute('height'));

      symbol.appendChild(svg);
    });

  return [symbol, p];
}

function createPieceElement(id, img_id, x, y) {
  const use = document.createElementNS(SVGNS, 'use');
  use.setAttribute('href', '#' + img_id);
  use.setAttributeNS(XLINKNS, 'xlink:href', '#' + img_id);
  return use;
}

export class SurfaceView {
  constructor(model) {
    this.model = model;

    this.camera = new Camera();

    this.svg = document.querySelector('svg');

    this.overlay = document.createElementNS(SVGNS, 'g');
    this._initializeMatrix(this.overlay);
    this.svg.appendChild(this.overlay);

    this.assets = document.getElementById('assets');

    this.world = document.querySelector('svg g');
    this._initializeMatrix(this.world);

    const wdisp = this.world.style['display'];
    this.world.style['display'] = 'none';

    (async () => {
      await Promise.all(
        [...this.model.data.images.values()].map(a => this.addImageAsset(a))
      );

      this.addPiece(this.model.data.boards[0]);
      for (const p of this.model.data.pieces.values()) {
        this.addPiece(p);
      }

      this.world.style['display'] = wdisp;
      this.assets.style['display'] = 'none';
    })();
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

    return mp;
  }

  setPointerLocation(uid, pos) {
    let mp = document.getElementById(uid) || this._createPointer(uid);
    const cpos = this.worldToClient(pos);
    mp.transform.baseVal.getItem(0).setTranslate(cpos.x, cpos.y);
  }

  addImageAsset(asset) {
    const [ae, pr] = createImageAsset(
      'a_' + asset.id,
      this.model.meta.basedir + '/' + asset.src
    );

    this.assets.appendChild(ae);
    return pr;
  }

  addPiece(piece) {
    const a_ref = 'a_' + piece.faces[0].img;
    const a = document.getElementById(a_ref);

    const pe = createPieceElement(piece.id, a_ref, piece.x, piece.y);

    const svg = document.createElementNS(SVGNS, 'svg');
    svg.appendChild(pe);
    this.world.appendChild(svg);

    svg.id = piece.id;
    svg.setAttribute('x', piece.x);
    svg.setAttribute('y', piece.y);
    svg.setAttribute('width', a.getAttribute('width'));
    svg.setAttribute('height', a.getAttribute('height'));
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
    const pe = document.getElementById(piece.id);
    pe.parentNode.appendChild(pe);
    // TODO: outline should be constant width, not scaled?
    pe.style.outline = '2px solid black';
  }

  deselectPiece(piece) {
    const pe = document.getElementById(piece.id);
    pe.style.outline = null;
  }

  pieceIdFor(e) {
    return e.target.parentNode.id;
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
