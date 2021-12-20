import { ListenerSupport } from './listener.js';

function appendToMessageBox(textarea, msg) {
  textarea.value += msg + '\n';
  // ensure the textarea stays scrolled to the bottom
  textarea.scrollTop = textarea.scrollHeight;
}

export class Console {
  constructor(name) {
    this.listeners = {};

    this.name = name;

    this.messages = document.getElementById("messages");
    this.messageInput = document.getElementById("messageInput");

    const scope = this;

    // add message and notify on enter in message input
    this.messageInput.addEventListener('keypress', e => {
      if (e.key === 'Enter') {
        const msg = scope.messageInput.value;
        scope.messageInput.value = "";
        scope.append(scope.name + ": " + msg);
        scope.notify('message', {
          type: 'message',
          name: scope.name,
          text: msg
        });
      }
    });
  }

  append(msg) {
    appendToMessageBox(this.messages, msg);
  }
}

Object.assign(Console.prototype, ListenerSupport);
