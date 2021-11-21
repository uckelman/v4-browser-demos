import { Connection } from './conn.js';

function init() {
  const recvId = document.getElementById("receiver-id");
  const status = document.getElementById("status");
  const message = document.getElementById("message");
  const sendMessageBox = document.getElementById("sendMessageBox");

  const conn = new Connection();

  conn.on('peerid', id => {
    recvId.innerHTML = id;
    status.innerHTML = "Awaiting connection...";
  });

  conn.on('connected', () => {
    status.innerHTML = "Connected";
  });

  conn.on('recv', data => {
    message.innerHTML = "<br><span>O: " + data + "</span>" + message.innerHTML;
  });

  conn.on('close', () => {
    status.innerHTML = "Connection reset<br>Awaiting connection...";
  });

  conn.on('disconnected', () => {
    status.innerHTML = "Connection lost. Please reconnect";
  });

  conn.on('destroyed', () => {
    status.innerHTML = "Connection destroyed. Please refresh";
  });

  conn.on('error', err => {
    alert('' + err);
  });

  // Send on enter in message box
  sendMessageBox.addEventListener('keypress', e => {
    const event = e || window.event;
    const char = event.which || event.keyCode;
    if (char == '13') {
      const msg = sendMessageBox.value;
      sendMessageBox.value = "";
      conn.send(msg);
      message.innerHTML = "<br><span>S: " + msg  + "</span>" + message.innerHTML;
    }
  });

  conn.start();
  conn.listen();
}

init();
