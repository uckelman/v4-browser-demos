import { Connection } from './conn.js';

function init() {
  const status = document.getElementById("status");
  const recvIdInput = document.getElementById("receiver-id");
  const connectButton = document.getElementById("connect-button");
  const sendMessageBox = document.getElementById("sendMessageBox");
  const message = document.getElementById("message");

  const conn = new Connection();

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
      message.innerHTML = "<br><span>S: " + msg + "</span>" + message.innerHTML;
    }
  });

  // Start peer connection on click
  connectButton.addEventListener('click', () => {
    conn.connect(recvIdInput.value);

    conn.on('open', peer_id => {
      status.innerHTML = "Connected to: " + peer_id;
    });

    // Handle incoming data (messages only since this is the signal sender)
    conn.on('recv', data => {
      message.innerHTML = "<br><span>O: " + data + "</span>" + message.innerHTML;
    });

    conn.on('close', () => {
      status.innerHTML = "Connection closed";
    });
  });

  conn.start();
}

init();
