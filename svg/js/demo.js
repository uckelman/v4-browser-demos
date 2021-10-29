const SVGNS = 'http://www.w3.org/2000/svg'

function loadPiece(url, x, y, z, parent) {
  const img = document.createElementNS(SVGNS, 'image');
  img.setAttributeNS(null, 'href', url);
  img.setAttributeNS(null, 'x', x);
  img.setAttributeNS(null, 'y', y);
  parent.appendChild(img);
  return img;
}

function matrix(a, b, c, d, tx, ty) {
  return `matrix(${a}, ${b}, ${c}, ${d}, ${tx}, ${ty})`; 
}

function toMatrix(s, t, tx, ty) {
  const s_sin_t = s * Math.sin(t);
  const s_cos_t = s * Math.cos(t);

  return matrix(
    s_cos_t,
    s_sin_t, 
    -s_sin_t,
    s_cos_t,
    s_cos_t * tx - s_sin_t * ty, 
    s_sin_t * tx + s_cos_t * ty
  );
}

function updateMatrix(element, scale, theta, tx, ty) {
  element.style.transform = toMatrix(scale, theta, tx, ty);
}

function init() {
  const world = document.getElementById('world');
  const ctxmenu = document.getElementById('ctxmenu');
  const svg = document.createElementNS(SVGNS, 'svg');
/*
  svg.setAttributeNS(null, 'width', window.innerWidth);
  svg.setAttributeNS(null, 'height', window.innerHeight);
*/
  svg.setAttributeNS(null, 'viewBox', '0 0 1000 1000');
  svg.style.overflow = 'visible';
  world.appendChild(svg);

  let menuVisible = false;

  const scaleStep = 0.25;
  let scale = 1.0;

  let theta = 0.0;

  let tx = 0.0;
  let ty = 0.0;  

  const moveStart = {x: 0, y: 0};
  const moveEnd = {x: 0, y: 0};

  const STATE = {
    NONE: 0,
    PAN: 1,
    DRAG: 2,
    ROTATE: 3
  };

  let state = STATE.NONE;

  const pieces = {};

  let dragging = null;

  function onWheel(event) {
    event.preventDefault();
    scale *= Math.exp(-Math.sign(event.deltaY) * scaleStep);
    updateMatrix(svg, scale, theta, tx, ty);
  }

  function onPointerDown(event) {
    event.preventDefault();

    switch (event.button) {
    case 0:
      moveStart.x = event.clientX;
      moveStart.y = event.clientY;

      if (event.ctrlKey) {
        state = STATE.ROTATE;
      }
      else {
        if (pieces[event.target.id] === true) {
          state = STATE.DRAG;
          dragging = event.target;
          dragging.parentNode.appendChild(dragging);
        }
        else {
          state = STATE.PAN;
        }
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

  function onPointerMove(event) {
    event.preventDefault();

    switch (state) {
    case STATE.PAN:
      {
        moveEnd.x = event.clientX;
        moveEnd.y = event.clientY;
        
        const dx = (moveEnd.x - moveStart.x) / scale; 
        const dy = (moveEnd.y - moveStart.y) / scale; 

        moveStart.x = moveEnd.x;
        moveStart.y = moveEnd.y;

        const cosTheta = Math.cos(theta);
        const sinTheta = Math.sin(theta);

        tx += cosTheta * dx + sinTheta * dy;
        ty += -sinTheta * dx + cosTheta * dy;
        updateMatrix(svg, scale, theta, tx, ty);
      }
      break;

    case STATE.DRAG:
      {
        moveEnd.x = event.clientX;
        moveEnd.y = event.clientY;

        const dx = (moveEnd.x - moveStart.x) / scale; 
        const dy = (moveEnd.y - moveStart.y) / scale; 

        moveStart.x = moveEnd.x;
        moveStart.y = moveEnd.y;

        const cosTheta = Math.cos(theta);
        const sinTheta = Math.sin(theta);

        const rdx = cosTheta * dx + sinTheta * dy;
        const rdy = -sinTheta * dx + cosTheta * dy;

        dragging.setAttributeNS(null, 'x', parseFloat(dragging.getAttributeNS(null, 'x')) + rdx);
        dragging.setAttributeNS(null, 'y', parseFloat(dragging.getAttributeNS(null, 'y')) + rdy);
      }
      break;

    case STATE.ROTATE:
      {
        moveEnd.x = event.clientX;
        moveEnd.y = event.clientY;

        const vx = moveStart.x - (window.innerWidth/2);
        const vy = moveStart.y - (window.innerHeight/2);
        const va = Math.atan2(vy, vx);

        const ux = moveEnd.x - (window.innerWidth/2);
        const uy = moveEnd.y - (window.innerHeight/2);
        const ua = Math.atan2(uy, ux);

        let dtheta = ua - va;

        moveStart.x = moveEnd.x;
        moveStart.y = moveEnd.y;

        theta += dtheta;

        theta %= 2.0*Math.PI;
        if (theta > Math.PI) {
          theta -= 2.0*Math.PI;
        }
        else if (theta < -Math.PI) {
          theta += 2.0*Math.PI;
        }

        updateMatrix(svg, scale, theta, tx, ty);
      }
    }
  }

  function onPointerUp(event) {
		world.removeEventListener('pointermove', onPointerMove);
		world.removeEventListener('pointerup', onPointerUp);
  	state = STATE.NONE;
  }

  function onContextMenu(event) {
    event.preventDefault();
    ctxmenu.style.left = event.pageX + 'px';
    ctxmenu.style.top = event.pageY + 'px';
    ctxmenu.style.display = 'block';
    menuVisible = true;
  }

  function onClick(event) {
    if (menuVisible) {
      ctxmenu.style.display = 'none';
      menuVisible = false;
    }
  }

  world.addEventListener('wheel', onWheel);
  world.addEventListener('pointerdown', onPointerDown);

  world.addEventListener('contextmenu', onContextMenu);
  world.addEventListener('click', onClick);
  ctxmenu.addEventListener('click', onClick);

/*
  function onMouseOver(event) {
    event.preventDefault();
    event.target.style.outline = "1px solid black";
  }

  function onMouseOut(event) {
    event.preventDefault();
    event.target.style.outline = null;
  }
*/

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

/*
      piece.addEventListener('mouseover', onMouseOver);
      piece.addEventListener('mouseout', onMouseOut);
*/

      pieces[piece.id] = true;
    });

    return z;
  }

  function loadMap(name, parent) {
    loadPiece('images/' + name, 0, 0, 1, parent);
  }

  async function loadGame(parent) {
    const lines = (await (await fetch('images/pieces')).text()).trim().split("\n");

    loadMap(lines[0], parent);

    loadPieces(lines.slice(1), 1, parent);
//    for (let z = 1; z < 5000; ) { 
//      z = loadPieces(lines.slice(1), z, parent);
//    }
  }

  loadGame(svg);
}

init();
