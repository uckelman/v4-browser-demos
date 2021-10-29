import * as THREE from './build/three.module.js'

import Stats from './examples/jsm/libs/stats.module.js';

let camera, scene, renderer, stats, controls;

function init() {
  renderer = new THREE.WebGLRenderer({antialias: true});
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  stats = new Stats();
  document.body.appendChild(stats.dom);

  scene = new THREE.Scene();

  camera = new THREE.OrthographicCamera(
    -window.innerWidth/2,  // left
    window.innerWidth/2,   // right
    window.innerHeight/2,  // top
    -window.innerHeight/2, // bottom
    0.1,                   // near
    1000                   // far
  );

  camera.position.set(0, 0, 500);
  camera.lookAt(0, 0, 0);

  const loader = new THREE.TextureLoader();
  const max_anisotropy = renderer.capabilities.getMaxAnisotropy();  

  function loadTexture(url) {
    return new Promise(resolve => loader.load(url, resolve, undefined, err => console.error(err))).then(t => {
      t.anisotropy = max_anisotropy;
      return t;
    });
  }

  function loadPiece(texture, x, y, z) {
    const material = new THREE.MeshBasicMaterial({ map: texture });

    const geometry = new THREE.PlaneGeometry(
      texture.image.naturalWidth,
      texture.image.naturalHeight
    );
  
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);

    scene.add(mesh);
    return mesh;
  }

  async function loadPieces(names) {
    let z = 1;

    const pp = names.map(async (name) => loadPiece(
      await loadTexture('images/' + name),
      window.innerWidth * (Math.random() - 0.5),
      window.innerHeight * (Math.random() - 0.5),
      ++z
    ));

    const pieces = await Promise.all(pp);
    controls = new Controls(pieces, camera, renderer.domElement);
  }

  async function loadMap(name) {
    loadPiece(await loadTexture('images/' + name), 0, 0, 1);
  }

  async function loadGame() {
    const lines = (await (await fetch('images/pieces')).text()).trim().split("\n");

    loadMap(lines[0]);
    loadPieces(lines.slice(1));
  }

  loadGame();

  render();
}

/*
// better FPS:

var timeTarget = 0;

function render() {
  if (Date.now() >= timeTarget) {
    renderer.render(scene, camera);
    stats.update();
  //  controls.update();
  
    timeTarget += 1000/60;
    if (Date.now() >= timeTarget) {
      timeTarget = Date.now();
    }
  }

  requestAnimationFrame(render);
}
*/

/*
function render() {
  renderer.render(scene, camera);
  stats.update();
//  controls.update();
  requestAnimationFrame(render);
}
*/

/*
var now, delta, then = Date.now();
const interval = 1000/30;

function render() {
  requestAnimationFrame(render);
  now = Date.now();
  delta = now - then;
  if (delta > interval) {
    renderer.render(scene, camera);
    stats.update();
  //  controls.update();
    then = now - (delta % interval);
  }
}
*/

let clock = new THREE.Clock();
let delta = 0;
const interval = 1 / 30;

function render() {
  requestAnimationFrame(render);
  delta += clock.getDelta();
  
  if (delta > interval) {
    renderer.render(scene, camera);
    stats.update();
  //  controls.update();
    delta = delta % interval;
  }
}


class Controls extends THREE.EventDispatcher {

  constructor(objects, camera, domElement) {
  	super();

    this.objects = objects;

    this.camera = camera;
    this.domElement = domElement;

    this.target = new THREE.Vector3();

    this.zoomSpeed = 1.0;
    this.minZoom = 0;
		this.maxZoom = Infinity;

    this.panSpeed = 1.0;

    this.rotateSpeed = 1.0;

    const scope = this;

    const STATE = {
      NONE: 0,
      PAN: 1,
      ZOOM: 2,
      DRAG: 3,
      HOVER: 4
    };

    let state = STATE.NONE;

    const EPSILON = 0.000001;

    const panStart = new THREE.Vector2();
		const panEnd = new THREE.Vector2();
		const panDelta = new THREE.Vector2();
    const panOffset = new THREE.Vector3();

    const rotateStart = new THREE.Vector2();
 		const rotateEnd = new THREE.Vector2();

    let zoomChanged = false;
    let angleChanged = false;

    const raycaster = new THREE.Raycaster();
    const intersections = [];
    const mouse = new THREE.Vector2();
    const plane = new THREE.Plane();
    const dragOffset = new THREE.Vector3();
    const inverseMatrix = new THREE.Matrix4();
    const worldPosition = new THREE.Vector3();
    const intersection = new THREE.Vector3();

    let selected = null;
    let hovered = null;

    let zmax = objects[objects.length-1].position.z;

    function getZoomScale() {
			return Math.pow(0.95, scope.zoomSpeed);
		}

    function onMouseWheel(event) {
      if (state !== STATE.NONE && state !== STATE.HOVER) {
        return;
      }

      event.preventDefault();

      if (event.deltaY < 0) {
				zoom(1.0/getZoomScale());
			}
      else if (event.deltaY > 0) {
				zoom(getZoomScale());
			}

			scope.update();
    }

    function zoom(zoomScale) {
      scope.camera.zoom = Math.max(scope.minZoom, Math.min(scope.maxZoom, scope.camera.zoom * zoomScale));
			scope.camera.updateProjectionMatrix();
			zoomChanged = true;
    }

    function onPointerDown(event) {
	    // Prevent the browser from scrolling.
			event.preventDefault();

    	// Manually set the focus since calling preventDefault above
			// prevents the browser from setting it automatically.
      scope.domElement.focus ? scope.domElement.focus() : window.focus();

			switch (event.button) {
      case 0:
        if (event.ctrlKey) {
          state = STATE.ROTATE;
          rotateStart.set(event.clientX, event.clientY);
        }
        else {
          switch (state) {
          case STATE.HOVER:
            selected = hovered;

            if (raycaster.ray.intersectPlane(plane, intersection)) {
					    inverseMatrix.copy(selected.parent.matrixWorld).invert();
					    dragOffset.copy(intersection).sub(worldPosition.setFromMatrixPosition(selected.matrixWorld));
            }

            selected.position.z = ++zmax;

            scope.domElement.style.cursor = 'move';
            state = STATE.DRAG;

            scope.update();
            break;

          default:
            state = STATE.PAN;
            panStart.set(event.clientX, event.clientY);
          }
        }
        break;

      default:
        state = STATE.NONE;
      }

      if (state !== STATE.NONE) {
//  	    scope.domElement.ownerDocument.addEventListener('pointermove', onPointerMove );
	  		scope.domElement.ownerDocument.addEventListener('pointerup', onPointerUp );
      }
    }

    function onPointerMove(event) {
      event.preventDefault();

      switch (state) {
      case STATE.PAN:
	      panEnd.set(event.clientX, event.clientY);
        panDelta.subVectors(panEnd, panStart).multiplyScalar(scope.panSpeed);
			  pan(panDelta.x, panDelta.y);
			  panStart.copy(panEnd);
			  scope.update();
        break;

      case STATE.ROTATE:
        rotateEnd.set(event.clientX, event.clientY);

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

  			rotateStart.copy(rotateEnd);

        if (theta != 0.0) {
          rotate(theta);
          scope.update();
        }
        break;

      case STATE.DRAG:
        {
          const rect = scope.domElement.getBoundingClientRect();

  			  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  			  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    			raycaster.setFromCamera(mouse, camera);

          if (selected) {
  	        if (raycaster.ray.intersectPlane(plane, intersection)) {
              selected.position.copy(intersection.sub(dragOffset).applyMatrix4(inverseMatrix));
              selected.position.z = zmax;
            }
          }
        }
        break;

      case STATE.NONE:
      case STATE.HOVER:
        {
          const rect = scope.domElement.getBoundingClientRect();

          mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
          mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

          intersections.length = 0;

          raycaster.setFromCamera(mouse, camera);
          raycaster.intersectObjects(scope.objects, true, intersections);

          if (intersections.length > 0) {
            const object = intersections[0].object;
            
            plane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(plane.normal), worldPosition.setFromMatrixPosition(object.matrixWorld));

            if (hovered !== object && hovered !== null) {
              scope.domElement.style.cursor = 'auto';
              hovered = null;
            }

            if (hovered !== object) {
              scope.domElement.style.cursor = 'pointer';
              hovered = object;
            }
          }
          else {
            if (hovered !== null) {
              scope.domElement.style.cursor = 'auto';
              hovered = null;
            }
          }

          state = hovered !== null ? STATE.HOVER : STATE.NONE;
        }
        break;
      }
    }

    const rotate = function () {
      const m = new THREE.Matrix4();

      return function rotate(theta) {
        scope.camera.up.applyMatrix4(m.makeRotationZ(theta));
        scope.camera.updateProjectionMatrix();
        angleChanged = true;
      };
    }();

    function pan(deltaX, deltaY) {
      const element = scope.domElement;

      // orthographic
			panLeft(deltaX * (scope.camera.right - scope.camera.left) / scope.camera.zoom / element.clientWidth, scope.camera.matrix);
		  panUp(deltaY * (scope.camera.top - scope.camera.bottom ) / scope.camera.zoom / element.clientHeight, scope.camera.matrix);
    }

    const panUp = function () {
      const v = new THREE.Vector3();

      return function panUp(distance, cameraMatrix) {
      	v.setFromMatrixColumn(cameraMatrix, 1);
        v.multiplyScalar(distance);
	  		panOffset.add(v);
      };
    }();

    const panLeft = function () {
      const v = new THREE.Vector3();

      return function panLeft(distance, cameraMatrix) {
        v.setFromMatrixColumn(cameraMatrix, 0); // get X column of cameraMatrix
	  		v.multiplyScalar(-distance);
  	  	panOffset.add(v);
      };
    }();

    function onPointerUp(event) {
      switch (state) {
      case STATE.DRAG:
        selected = null;
        hovered = null;
	      scope.domElement.style.cursor = 'auto';
        break;
      }

			scope.domElement.ownerDocument.removeEventListener('pointermove', onPointerMove);
			scope.domElement.ownerDocument.removeEventListener('pointerup', onPointerUp);
			state = STATE.NONE;
		}

    this.update = function() {
      const lastPosition = new THREE.Vector3(); 
      const offset = new THREE.Vector3();

      return function update() {
        offset.copy(scope.camera.position).sub(scope.target);

        // move to panned location
        scope.target.add(panOffset);

        scope.camera.position.copy(scope.target).add(offset);

				scope.camera.lookAt(scope.target);

        panOffset.set(0, 0, 0);

        if (zoomChanged || angleChanged || lastPosition.distanceToSquared(scope.camera.position) > EPSILON) {
          lastPosition.copy(scope.camera.position);
          zoomChanged = false;
          angleChanged = false;
          return true;
        }

        return false;
      };
    }();

    function onWindowResize() {
      scope.camera.left = -window.innerWidth/2;
      scope.camera.right = window.innerWidth/2;
      scope.camera.top = window.innerHeight/2;
      scope.camera.bottom = -window.innerHeight/2;

      scope.camera.updateProjectionMatrix();

      renderer.setSize(window.innerWidth, window.innerHeight);
    }
 
  	window.addEventListener('resize', onWindowResize);

  	scope.domElement.addEventListener('pointerdown', onPointerDown);
    scope.domElement.addEventListener('pointermove', onPointerMove);
   	scope.domElement.addEventListener('wheel', onMouseWheel);

  	// force an update at start
		this.update();
  }
}

init();
