import { ListenerSupport } from './listener.js';

export class SurfaceController {
  constructor(model, uimodel, view) {
    this.model = model;
    this.view = view;
    this.uimodel = uimodel;

    this.listeners = {};

    const moveStart = new DOMPoint();
    const moveEnd = new DOMPoint();

    const mousePos = new DOMPoint();

    const scaleStep = 0.1;

    const STATE = {
      NONE: 0,
      PAN: 1,
      DRAG: 2,
      ROTATE: 3
    };

    let state = STATE.NONE;

    let dragging = null;

    this.locked = new Set();

    const scope = this;

    function onPointerDown(e) {
      e.preventDefault();

      switch (e.button) {
      case 0:
        moveStart.x = e.clientX;
        moveStart.y = e.clientY;

        if (e.ctrlKey) {
          // begin rotating the view
          state = STATE.ROTATE;
        }
        else {
          dragging = model.data.pieces.get(view.pieceIdFor(e)) || null;
          if (dragging !== null) {
            if (scope.locked.has(dragging)) {
              state = STATE.NONE;
            }
            else {
              // begin dragging a piece
              state = STATE.DRAG;
              view.selectPiece(dragging);

              // lock dragging piece
              scope.notify('lock', { type: 'lock', pid: dragging.pid });
            }
          }
          else {
            // begin panning the view
            state = STATE.PAN;
          }
        }
        break;

      default:
        state = STATE.NONE;
      }

      if (state !== STATE.NONE) {
        view.addEventListener('pointerup', onPointerUp);
      }
    }

    function onWheel(e) {
      e.preventDefault();

      // the additional scale factor
      const ds = Math.exp(-Math.sign(e.deltaY) * scaleStep);

      // update the view
      view.scale(ds, e.clientX, e.clientY);
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

          // update the view
          view.translate(dx, dy);

          // reset our start point
          moveStart.x = moveEnd.x;
          moveStart.y = moveEnd.y;
        }
        break;

      case STATE.DRAG:
        {
          // determine distance moved
          moveEnd.x = e.clientX;
          moveEnd.y = e.clientY;

          // switch coordinate systems from client to world
          const sp = view.clientToWorld(moveStart);
          const ep = view.clientToWorld(moveEnd);

          // update the position of the piece
/*
          dragging['x'] += ep.x - sp.x;
          dragging['y'] += ep.y - sp.y;

          view.updatePiece(dragging, ['x', 'y']);
*/
          const dx =  ep.x - sp.x;
          const dy =  ep.y - sp.y;

          scope.notify('move', {
            type: 'move',
            pid: dragging.id,
            prev_x: dragging.x,
            prev_y: dragging.y,
            prev_z: dragging.z,
            next_x: dragging.x + dx,
            next_y: dragging.y + dy,
            next_z: dragging.z
          });

          // reset our start point
          moveStart.x = moveEnd.x;
          moveStart.y = moveEnd.y;
        }
        break;

      case STATE.ROTATE:
        {
          // the origin around which to rotate (window center)
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

          // update the view
          view.rotate(dtheta, ox, oy);

          // reset our start point
          moveStart.x = moveEnd.x;
          moveStart.y = moveEnd.y;
        }
      }

      mousePos.x = e.clientX;
      mousePos.y = e.clientY;
      const wpos = view.clientToWorld(mousePos);
      scope.notify('mpos', {
        type: 'mpos',
        name: scope.uimodel.name,
        x: wpos.x,
        y: wpos.y
      });
    }

    function onPointerUp(e) {
      e.preventDefault();

      if (dragging !== null) {
        view.deselectPiece(dragging);

        // notify other clients of unlock
        scope.notify('unlock', { type: 'unlock', pid: dragging.pid });

        dragging = null;
      }

      view.removeEventListener('pointerup', onPointerUp);
      state = STATE.NONE;
    }

    function onPointerLeave(e) {
      e.preventDefault();
      scope.notify('mleave', { type: 'mleave', name: scope.uimodel.name });
    }

    // listen for mouse events
    view.addEventListener('wheel', onWheel);
    view.addEventListener('pointerdown', onPointerDown);
    view.addEventListener('pointermove', onPointerMove);
    view.addEventListener('pointerleave', onPointerLeave);
  }

  lock(id) {
    this.locked.add(id);
  }

  unlock(id) {
    this.locked.delete(id);
  } 
}

Object.assign(SurfaceController.prototype, ListenerSupport);

/*
export class LockCommand {
  constructor(d) {
    this.data = d;
  }

  static fromPiece(p) {
    return new LockCommand({
      type: 'lock',
      pid: p.id
    });
  }

  execute(controller) {
    const 
  }
}
*/
