export class LamportClock {
  constructor() {
    this.time = 0;
  }

  tick(requestTime = -1) {
    this.time = Math.max(this.time, requestTime) + 1;
    return this.time;
  }
}
