const RAD_TO_DEG = 180 / Math.PI;

export class Camera {
  constructor() {
    // TODO: remove once everything supports DOMMatrix
    this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");

    this.m = this.svg.createSVGMatrix();
    this.m_inv = null;
  }

   scale(ds, ox, oy) {
     this.m = this.svg.createSVGMatrix()
                  .translate(ox, oy)
                  .scale(ds)
                  .translate(-ox, -oy)
                  .multiply(this.m);
    this.m_inv = null;
    return this.m;
  }

  translate(dx, dy) {
    this.m = this.svg.createSVGMatrix()
                 .translate(dx, dy)
                 .multiply(this.m);
    this.m_inv = null;
    return this.m;
  }

  rotate(dtheta, ox, oy) {
    // NB: these barbarians use degrees
    this.m = this.svg.createSVGMatrix()
                 .translate(ox, oy)
                 .rotate(dtheta * RAD_TO_DEG)
                 .translate(-ox, -oy)
                 .multiply(this.m);
    this.m_inv = null;
    return this.m;
  }

  clientToWorld(p) {
    if (this.m_inv === null) {
      this.m_inv = this.m.inverse();
    }
    return p.matrixTransform(this.m_inv);
  }

  worldToClient(p) {
    return p.matrixTransform(this.m);
  }
}
