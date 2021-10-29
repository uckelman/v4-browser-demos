
function init() {
  const world = document.getElementById('world')

  const panzoom = Panzoom(world, {minScale: 0.01, maxScale: 4});

  document.addEventListener('wheel', adjustScale);
  document.addEventListener('pointerdown', onPointerDown);

  const rotateStart = {x: 0, y: 0};
  const rotateEnd = {x: 0, y: 0};
  let rotating = false;

  function onPointerDown(event) {
    event.preventDefault();
    document.focus ? document.focus() : window.focus();

    switch (event.button) {
    case 0:
      if (event.ctrlKey) {
        rotateStart.x = event.clientX;
        rotateStart.y = event.clientY;
        rotating = true;
        document.addEventListener('pointermove', onPointerMove);
        document.addEventListener('pointerup', onPointerUp);
      }
      break;
    }
  }

  function onPointerMove(event) {
    event.preventDefault();

    if (rotating) {
      rotateEnd.x = event.clientX;
      rotateEnd.y = event.clientY;

      const vx = rotateStart.x - (window.innerWidth/2);
      const vy = rotateStart.y - (window.innerHeight/2);
      const va = Math.atan2(vy, vx);

      const ux = rotateEnd.x - (window.innerWidth/2);
      const uy = rotateEnd.y - (window.innerHeight/2);
      const ua = Math.atan2(uy, ux);

      let theta = ua - va; 

      theta %= 2.0*Math.PI;
      if (theta > Math.PI) {
        theta -= 2.0*Math.PI;
      }
      else if (theta < -Math.PI) {
        theta += 2.0*Math.PI;
      }

      rotateStart.x = rotateEnd.x;
      rotateStart.y = rotateEnd.y;

      if (theta != 0.0) {
        let t = world.parentElement.style.transform;
        if (t !== "") {
          t = t.replace(/[^-\d.]/g, '');
          theta += parseFloat(t);
        }
        world.parentElement.style.transform = `rotate(${theta}rad)`;
      }
    }
  }

  function onPointerUp(event) {
	  document.removeEventListener('pointermove', onPointerMove);
	  document.removeEventListener('pointerup', onPointerUp);
    rotating = false;
  }

  const piece_panzooms = [];

  function adjustScale(event) {
    const oldScale = panzoom.getScale();
    panzoom.zoomWithWheel(event);
    const newScale = panzoom.getScale();

    piece_panzooms.forEach(ppz => {
      const pan = ppz.getPan();
      // Adjust child starting X/Y according the new scale for panning
      ppz.pan(
        (pan.x / oldScale) * newScale,
        (pan.y / oldScale) * newScale,
        { animate: true }
      );
    });
  }

  function loadPiece(url, x, y, z, parent) {
    let img = document.createElement('img');
    img.src = url;
    parent.appendChild(img);
  }

  function loadPieces(names) {
    let z = 1;

    names.map(name => {
      let pdiv = document.createElement('div');
      world.appendChild(pdiv);
      const pz = Panzoom(pdiv, {
        setTransform: (elem, { x, y, scale }) => {
          // Adjust the panning according to the parent's scale
          const parentScale = panzoom.getScale();
          pz.setStyle(
            'transform',
            `scale(${scale}) translate(${x / parentScale}px, ${y / parentScale}px)`
          );
        }
      });

      piece_panzooms.push(pz);

      loadPiece(
        'images/' + name,
        world.innerWidth * (Math.random() - 0.5),
        world.innerHeight * (Math.random() - 0.5),
        ++z,
        pdiv
      );

    });
  }

  function loadMap(name) {
    loadPiece('images/' + name, 0, 0, 1, world);
  }

  async function loadGame() {
    const lines = (await (await fetch('images/pieces')).text()).trim().split("\n");

    loadMap(lines[0]);
    loadPieces(lines.slice(1));
  }

  loadGame();
}

init();
