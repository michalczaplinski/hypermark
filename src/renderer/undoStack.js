class UndoStack {
  constructor(timeout) {
    this.stack = [];
    this.timeout = timeout;
  }

  push(note) {
    return this.stack.push(note);
  }

  undo() {
    const undoFunc = this.stack.pop();
    try {
      undoFunc();
    } catch (e) {
      console.warn("nothing left on the stack");
    }
  }
}

const undoStack = new UndoStack();

export default undoStack;
