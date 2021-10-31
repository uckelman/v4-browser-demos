
function loadPiece(url, x, y, z, parent) {
  const img = document.createElement('img');
  img.setAttribute('src', url);

  const div = document.createElement('div');
  div.style.left = `${x}px`;
  div.style.top = `${y}px`;
  div.appendChild(img);

  parent.appendChild(div);
  return div;
}

const SVGNS = 'http://www.w3.org/2000/svg';

const RAD_TO_DEG = 180 / Math.PI;

class Camera {
  constructor() {
    this.svg = document.createElementNS(SVGNS, 'svg');
    this.m = this.createSVGMatrix();
    this.m_inv = null;
  }

   createSVGMatrix() {
     return this.svg.createSVGMatrix();
   }

   scale(ds, ox, oy) {
     this.m = this.createSVGMatrix()
                  .translate(ox, oy)
                  .scale(ds)
                  .translate(-ox, -oy)
                  .multiply(this.m);
    this.m_inv = null;
    return this.m;
  }

  translate(dx, dy) {
    this.m = this.createSVGMatrix()
                 .translate(dx, dy)
                 .multiply(this.m);
    this.m_inv = null;
    return this.m;
  }

  rotate(dtheta, ox, oy) {
    // for some reason, these barbarians use degrees
    this.m = this.createSVGMatrix()
                 .translate(ox, oy)
                 .rotate(dtheta * RAD_TO_DEG)
                 .translate(-ox, -oy)
                 .multiply(this.m);
    this.m_inv = null;
    return this.m;
  }

  inverse() {
    if (this.m_inv === null) {
      this.m_inv = this.m.inverse();
    }
    return this.m_inv;
  }

  createSVGPoint() {
    return this.svg.createSVGPoint();
  }
}

function matrix(a, b, c, d, e, f) {
  return `matrix(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`; 
}

function init() {
  const world = document.getElementById('world');
  const ctxmenu = document.getElementById('ctxmenu');

  const g = document.querySelector('div div');
  g.style.position = 'relative';

  g.style.transform = matrix(1, 0, 0, 1, 0, 0);

  const camera = new Camera();

  const scaleStep = 0.1;

  const moveStart = {x: 0, y: 0};
  const moveEnd = {x: 0, y: 0};

  const STATE = {
    NONE: 0,
    PAN: 1,
    DRAG: 2,
    ROTATE: 3
  };

  let state = STATE.NONE;

  let dragging = null;

  let menuVisible = false;

  const pieces = {};

  function onPointerDown(e) {
    e.preventDefault();

    switch (e.button) {
    case 0:
      moveStart.x = e.clientX;
      moveStart.y = e.clientY;

      if (e.ctrlKey) {
        state = STATE.ROTATE;
      }
      else if (pieces[e.target.parentElement.id] === true) {
        state = STATE.DRAG;
        dragging = e.target.parentElement;
        dragging.parentNode.appendChild(dragging);
        dragging.style.outline = '2px solid black';
      }
      else {
        state = STATE.PAN;
      }
      break;

    default:
      state = STATE.NONE;
    }

    if (state !== STATE.NONE) {
      world.addEventListener('pointermove', onPointerMove);
      world.addEventListener('pointerup', onPointerUp);
    }
  }

  function onWheel(e) {
    e.preventDefault();

    // the origin around which to zoom
    const ox = e.clientX;
    const oy = e.clientY;

    // the additional scale factor
    const ds = Math.exp(-Math.sign(e.deltaY) * scaleStep);

    // update the matrix
    const m = camera.scale(ds, ox, oy);
    g.style.transform = matrix(m.a, m.b, m.c, m.d, m.e, m.f);
  }

  function onPointerMove(e) {
    e.preventDefault();

    switch (state) {
    case STATE.PAN:
      {
        // determine distance moved
        moveEnd.x = e.clientX;
        moveEnd.y = e.clientY;

        const dy = moveEnd.y - moveStart.y;
        const dx = moveEnd.x - moveStart.x;

        // reset our start point
        moveStart.x = moveEnd.x;
        moveStart.y = moveEnd.y;

        // update the matrix
        const m = camera.translate(dx, dy);
        g.style.transform = matrix(m.a, m.b, m.c, m.d, m.e, m.f);
      }
      break;

    case STATE.DRAG:
      {
        // determine distance moved
        moveEnd.x = e.clientX;
        moveEnd.y = e.clientY;

        const ep = camera.createSVGPoint();
        ep.x = moveEnd.x;
        ep.y = moveEnd.y;

        const sp = camera.createSVGPoint();
        sp.x = moveStart.x;
        sp.y = moveStart.y;

        // reset our start point
        moveStart.x = moveEnd.x;
        moveStart.y = moveEnd.y;

        // switch coordinate systems from camera to world
        const inv = camera.inverse();
        const eip = ep.matrixTransform(inv);
        const sip = sp.matrixTransform(inv);

        // update the position of the piece
        dragging.style.left = `${parseFloat(dragging.style.left, 10) + (eip.x - sip.x)}px`;
        dragging.style.top = `${parseFloat(dragging.style.top, 10) + (eip.y - sip.y)}px`;
/*
        // determine distance moved
        moveEnd.x = e.clientX;
        moveEnd.y = e.clientY;

        const raw_dx = moveEnd.x - moveStart.x;
        const raw_dy = moveEnd.y - moveStart.y;

        // reset our start point
        moveStart.x = moveEnd.x;
        moveStart.y = moveEnd.y;

        // translate movement from camera coords to world coords
        const theta = Math.atan(camera.m.b / camera.m.a);
        const cosTheta = Math.cos(theta);
        const sinTheta = Math.sin(theta);

        const s = camera.m.a / cosTheta;

        let dx = raw_dx / s;
        let dy = raw_dy / s;

        const cdx = cosTheta * dx + sinTheta * dy;
        const cdy = -sinTheta * dx + cosTheta * dy;

        // update the position of the piece
        dragging.x.baseVal.value += cdx;
        dragging.y.baseVal.value += cdy;
*/
      }
      break;

    case STATE.ROTATE:
      {
        // the origin around which to rotate
        const ox = window.innerWidth/2;
        const oy = window.innerHeight/2;

        // determine change in angle
        moveEnd.x = e.clientX;
        moveEnd.y = e.clientY;

        const vx = moveStart.x - ox;
        const vy = moveStart.y - oy;
        const va = Math.atan2(vy, vx);

        const ux = moveEnd.x - ox;
        const uy = moveEnd.y - oy;
        const ua = Math.atan2(uy, ux);

        const dtheta = ua - va;

        // reset our start point
        moveStart.x = moveEnd.x;
        moveStart.y = moveEnd.y;

        // update the matrix
        const m = camera.rotate(dtheta, ox, oy);
        g.style.transform = matrix(m.a, m.b, m.c, m.d, m.e, m.f);
      }
    }
  }

  function onPointerUp(e) {
    e.preventDefault();

    if (dragging !== null) {
      dragging.style.outline = null;
      dragging = null;
    }

		world.removeEventListener('pointermove', onPointerMove);
		world.removeEventListener('pointerup', onPointerUp);
  	state = STATE.NONE;
  }

  // listen for mouse events
  world.addEventListener('wheel', onWheel);
  world.addEventListener('pointerdown', onPointerDown);



  function onContextMenu(e) {
    e.preventDefault();
    ctxmenu.style.left = event.pageX + 'px';
    ctxmenu.style.top = event.pageY + 'px';
    ctxmenu.style.display = 'block';
    menuVisible = true;
  }

  function onClick(e) {
    e.preventDefault();
    if (menuVisible) {
      ctxmenu.style.display = 'none';
      menuVisible = false;
    }
  }

  // suppress the browser context menu
//  window.addEventListener('contextmenu', e => e.preventDefault());
  window.addEventListener('contextmenu', onContextMenu)
  window.addEventListener('click', onClick);
//  ctxmenu.addEventListener('click', onClick);



  function loadPieces(names, z, parent) {
    names.map(name => {
      const piece = loadPiece(
        'images/' + name,
        window.innerWidth * Math.random(),
        window.innerHeight * Math.random(),
        ++z,
        parent 
      );

      piece.id = z;

      pieces[piece.id] = true;
    });

    return z;
  }

  function loadMap(name, parent) {
    const map = loadPiece('images/' + name, 0, 0, 1, parent);
    map.id = 'map';
  }

  async function loadGame(parent) {
    const lines = (await (await fetch('images/pieces')).text()).trim().split("\n");

    loadMap(lines[0], parent);

    loadPieces(lines.slice(1), 1, parent);
//    for (let z = 1; z < 5000; ) { 
//      z = loadPieces(lines.slice(1), z, parent);
//    }
  }

  loadGame(g);
}

init();
