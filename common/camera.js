const RAD_TO_DEG = 180 / Math.PI;

export class Camera {
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
