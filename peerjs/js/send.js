import { Connection } from './conn.js';
import { Console } from './console.js';

function init() {
  const msgbox = new Console();
  const postMessage = msg => msgbox.append(msg);

  postMessage("Not connected");

  const params = new URLSearchParams(window.location.search);
  const other_id = params.get('id');

  const conn = new Connection();

  conn.on('peerid', id => {
    postMessage("We are " + id);
    postMessage("Connecting to " + other_id);
    conn.connect(other_id);
  });

  conn.on('open', peer_id => {
    postMessage("Connected to " + peer_id);
  });

  conn.on('recv', data => {
    postMessage("O: " + data);
  });

  conn.on('close', () => {
    postMessage("Connection closed.");
  });

  conn.on('disconnected', () => {
    postMessage("Connection lost. Please reconnect.");
  });

  conn.on('destroyed', () => {
    postMessage("Connection destroyed. Please refresh.");
  });

  conn.on('error', err => {
    postMessage("Error: " + err);
  });

  msgbox.on('message', msg => {
    conn.send(msg);
  });

  conn.start();
}

init();
