import { ListenerSupport } from './listener.js';

export class ConsoleController {
  constructor(name) {
    this.listeners = {};

    this.name = name;

    this.messageInput = document.getElementById("messageInput");

    const scope = this;

    // add message and notify on enter in message input
    this.messageInput.addEventListener('keypress', e => {
      if (e.key === 'Enter') {
        const msg = scope.messageInput.value;
        scope.messageInput.value = "";
        scope.notify('message', {
          type: 'message',
          name: scope.name,
          text: msg 
        });
      }
    });
  }
}

Object.assign(ConsoleController.prototype, ListenerSupport);

function appendToTextarea(textarea, msg) {
  textarea.value += msg + '\n';
  // ensure the textarea stays scrolled to the bottom
  textarea.scrollTop = textarea.scrollHeight;
}

export class ConsoleView {
  constructor() {
    this.messages = document.getElementById("messages");
  }

  append(text) {
    appendToTextarea(this.messages, text);
  }
}
