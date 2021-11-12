import * as THREE from './build/three.module.js';
import Stats from './examples/jsm/libs/stats.module.js';

function loadTextureFromImage(url, loader, anisotropy) {
  return new Promise(resolve => loader.load(
    url, resolve, undefined, err => console.error(err)
  )).then(t => {
    t.anisotropy = anisotropy;
    return t;
  });
}

function createMeshFromTexture(texture, x, y, z) {
  const material = new THREE.MeshBasicMaterial({ map: texture });

  const geometry = new THREE.PlaneGeometry(
    texture.image.naturalWidth,
    texture.image.naturalHeight
  );
  
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);

  return mesh;
}

export class View {
  constructor(game) {
    this.game = game;

    this.renderer = new THREE.WebGLRenderer({antialias: true});
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    document.body.appendChild(this.renderer.domElement);

    this.stats = new Stats();
    document.body.appendChild(this.stats.dom);

    this.scene = new THREE.Scene();

    this.camera = new THREE.OrthographicCamera(
      -window.innerWidth / 2,  // left
      window.innerWidth / 2,   // right
      window.innerHeight / 2,  // top
      -window.innerHeight / 2, // bottom
      0.1,                     // near
      1000                     // far
    );

    this.camera.position.set(0, 0, 500);
    this.camera.lookAt(0, 0, 0);

    this.loader = new THREE.TextureLoader();
    this.zmax = 0; 
   
    this.addPiece(game['boards'][0]);
    this.game['pieces'].forEach(p => this.addPiece(p));

    const scope = this;

    // window resize

    function onWindowResize() {
      scope.camera.left = -window.innerWidth / 2;
      scope.camera.right = window.innerWidth / 2;
      scope.camera.top = window.innerHeight / 2;
      scope.camera.bottom = -window.innerHeight / 2;

      scope.camera.updateProjectionMatrix();
      scope.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    window.addEventListener('resize', onWindowResize);

    // rendering

    const render_clock = new THREE.Clock();
    const render_interval = 1 / 30;
    let render_delta = 0;

    function render(ts) {
      requestAnimationFrame(render);
      render_delta += render_clock.getDelta();
  
      if (render_delta > render_interval) {
        scope.renderer.render(scope.scene, scope.camera);
        scope.stats.update();
    //  controls.update();
        render_delta %= render_interval;
      }
    }

    requestAnimationFrame(render);

    //
    
    this.raycaster = new THREE.Raycaster();
  }

  addEventListener(type, listener) {
    this.renderer.domElement.addEventListener(type, listener);
  }

  removeEventListener(type, listener) {
    this.renderer.domElement.removeEventListener(type, listener);
  }

  async addPiece(piece) {
    const z = this.zmax++;

    const max_anisotropy = this.renderer.capabilities.getMaxAnisotropy();

    const mesh = await createMeshFromTexture(
      await loadTextureFromImage(
        'images/' + piece['img'], this.loader, max_anisotropy
      ),
      piece['x'], 
      piece['y'],
      z
    )

    mesh.name = piece['id'];

    this.scene.add(mesh);
  }

  removePiece(piece) {
  }

  updatePiece(piece, updated) {
    const pe = this.scene.getObjectByName(piece['id']);

// FIXME: This isn't right
    const p = this.clientToView({x: piece['x'], y: -piece['y'], z: 0});

    for (const prop of updated) {
      if (prop == 'x') {
        pe.position.x = p.x;
      }
      else if (prop == 'y') {
        pe.position.y = p.y;
      }
    }
  }

  selectPiece(piece) {
  }

  deselectPiece(piece) {
  }

  pieceIdFor(e) {
    const rect = this.renderer.domElement.getBoundingClientRect();

    const mouse = new THREE.Vector2();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const intersections = [];

    this.raycaster.setFromCamera(mouse, this.camera);
    this.raycaster.intersectObjects(this.scene.children, true, intersections);

    if (intersections.length > 0) {
      const object = intersections[0].object;

      const plane = new THREE.Plane();
      const worldPosition = new THREE.Vector3();

      plane.setFromNormalAndCoplanarPoint(
        this.camera.getWorldDirection(plane.normal),
        worldPosition.setFromMatrixPosition(object.matrixWorld)
      );

      const intersection = new THREE.Vector3();
      if (this.raycaster.ray.intersectPlane(plane, intersection)) {
/*
        const inverseMatrix = new THREE.Matrix4();
        inverseMatrix.copy(object.parent.matrixWorld).invert();
*/
        console.log("hit " + object.name);
        return object.name;
      }
    }

    return null;
  }

  translate(dx, dy) {
    const tx = -dx * (this.camera.right - this.camera.left) / this.camera.zoom / this.renderer.domElement.clientWidth;
    const ty = dy * (this.camera.top - this.camera.bottom ) / this.camera.zoom / this.renderer.domElement.clientHeight;

    // move the camera
    this.camera.translateX(tx);
    this.camera.translateY(ty);

    // keep the camera facing straight ahead 
  	this.camera.lookAt(this.camera.position.x, this.camera.position.y, 0);
  }

  scale(ds, ox, oy) {
    // FIMXE: does not scale over point
/*
    oy = -oy;
    const sx = (this.camera.position.x - ox) / ds + ox;
    const sy = (this.camera.position.y - oy) / ds + oy;

    this.camera.position.x = sx;
    this.camera.position.y = sy;
*/

    this.camera.zoom *= ds;


		this.camera.updateProjectionMatrix();
// TODO: updateWorldMatrix seems sufficient here? 
//    this.camera.updateWorldMatrix(true, false);
  	this.camera.lookAt(this.camera.position.x, this.camera.position.y, 0);
  }

  rotate(dtheta, ox, oy) {
    // FIXME: ignores ox, oy
    const m = new THREE.Matrix4();
    this.camera.up.applyMatrix4(m.makeRotationZ(dtheta));
    this.camera.updateProjectionMatrix();
//    this.camera.updateWorldMatrix(true, false);
  	this.camera.lookAt(this.camera.position.x, this.camera.position.y, 0);
  }

  clientToView(p) {
    const inverseMatrix = new THREE.Matrix4();
    inverseMatrix.copy(this.scene.matrixWorld).invert();
    const worldPosition = new THREE.Vector3(p.x, p.y, p.z);
    worldPosition.applyMatrix4(inverseMatrix);
    return new DOMPoint(worldPosition.x, worldPosition.y, worldPosition.z);
  }
}
