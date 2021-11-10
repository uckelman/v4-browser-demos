
/*
class Board {
  constructor() {

  }

}

class Piece {
  constructor() {

  }

}
*/

export async function loadGame(url) {
  return JSON.parse(await (await fetch(url)).text());
}
