import { Connection } from './conn.js';
import { Console } from './console.js';

function init() {
  const msgbox = new Console();
  const postMessage = msg => msgbox.append(msg);

  postMessage("Not connected");

  const conn = new Connection();

  conn.on('log', msg => postMessage(msg));

  conn.on('peerid', id => {
    postMessage("We are " + id);
    postMessage("Awaiting connection...");
  });

  conn.on('connected', () => {
    postMessage("Connected");
  });

  conn.on('recv', data => {
    postMessage("O: " + data);
  });

  conn.on('close', () => {
    postMessage("Connection reset. Awaiting connection...");
  });

  conn.on('disconnected', () => {
    postMessage("Connection lost. Please reconnect.");
  });

  conn.on('destroyed', () => {
    postMessage("Connection destroyed. Please refresh.");
  });

  conn.on('error', err => {
    postMesasge("Error: " + err);
  });

  msgbox.on('message', msg => {
    conn.send(msg);
  });

  conn.start();
  conn.listen();
}

init();
