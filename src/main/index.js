import { app, BrowserWindow, ipcMain, globalShortcut, ipcRenderer } from "electron"; //eslint-disable-line
import Joi from "joi";
import { format as formatUrl } from "url";
import Store from "electron-store";
import path from "path";
import fs from "fs";
import { promisify } from "util";
import { is } from "electron-util";
import log from "electron-log";

import { validateObject } from "../util";
import MainMenuBuilder from "../menu";

require("electron-context-menu")();

const { COPYFILE_EXCL } = fs.constants;

const asyncCopyFile = promisify(fs.copyFile);

const state = {
  mainWindow: undefined,
  lastWindowPosition: undefined,
  openEditors: []
};

const SEARCHBAR_HEIGHT = 70;
const ITEM_HEIGHT = 60;

const isDevelopment = process.env.NODE_ENV !== "production";

function createMainWindow() {
  const window = new BrowserWindow({
    width: 420,
    height: SEARCHBAR_HEIGHT + ITEM_HEIGHT * 5 + 5,
    maxHeight: SEARCHBAR_HEIGHT + ITEM_HEIGHT * 6 + 5,
    frame: false,
    fullscreenable: false,
    disableAutoHideCursor: true,
    show: false,
    resizable: false
  });

  if (isDevelopment || process.env.DEBUG_PROD === "true") {
    window.webContents.openDevTools();
  }

  if (isDevelopment) {
    window.loadURL(`http://localhost:${process.env.ELECTRON_WEBPACK_WDS_PORT}`);
  } else {
    window.loadURL(
      formatUrl({
        pathname: path.join(__dirname, "index.html"),
        protocol: "file",
        slashes: true
      })
    );
  }

  window.on("closed", () => {
    state.mainWindow = null;
  });

  window.on("ready-to-show", () => {
    state.mainWindow.show();
    state.mainWindow.focus();
  });

  window.on("focus", () => {
    window.webContents.send("focus", true);
  });

  window.webContents.on("devtools-opened", () => {
    window.focus();
    setImmediate(() => {
      window.focus();
    });
  });

  return window;
}

function registerGlobalShortcut(shortcut) {
  const ret = globalShortcut.register(shortcut, () => {
    if (!state.mainWindow) {
      state.mainWindow = createMainWindow();
      const menuBuilder = new MainMenuBuilder(state.mainWindow);
      menuBuilder.buildMenu();
    } else if (state.mainWindow.isVisible() && !state.mainWindow.isFocused()) {
      state.mainWindow.focus();
    } else if (state.mainWindow.isVisible() && state.mainWindow.isFocused()) {
      state.mainWindow.hide();
    } else {
      state.mainWindow.show();
      state.mainWindow.focus();
    }
  });

  return ret;
}

function createEditorWindow(title) {
  let [x, y] = state.mainWindow.getPosition();
  switch (state.lastWindowPosition) {
    case "leftTop":
      [x, y] = [x + 100, y - 100];
      state.lastWindowPosition = "rightTop";
      break;
    case "rightTop":
      [x, y] = [x + 100, y + 100];
      state.lastWindowPosition = "rightBottom";
      break;
    case "rightBottom":
      [x, y] = [x - 100, y + 100];
      state.lastWindowPosition = "leftBottom";
      break;
    case "leftBottom":
      [x, y] = [x - 100, y - 100];
      state.lastWindowPosition = "leftTop";
      break;
    default:
      [x, y] = [x + 100, y - 100];
      state.lastWindowPosition = "rightTop";
  }

  const window = new BrowserWindow({
    x,
    y,
    width: 565,
    height: 480,
    minWidth: 200,
    title
  });

  if (isDevelopment || process.env.DEBUG_PROD === "true") {
    window.webContents.openDevTools();
  }

  if (isDevelopment) {
    window.loadURL(
      `http://localhost:${process.env.ELECTRON_WEBPACK_WDS_PORT}?editor`
    );
  } else {
    window.loadURL(`file:///${__dirname}/index.html?editor`);
  }

  window.on("close", event => {
    const editor = state.openEditors.find(
      e => e.noteTitle === event.sender.editorProps.noteTitle
    );
    if (editor) {
      editor.editorWindow = null;
      state.openEditors = state.openEditors.filter(
        e => e.noteTitle !== event.sender.editorProps.noteTitle
      );
    }
  });

  window.webContents.on("devtools-opened", () => {
    window.focus();
    setImmediate(() => {
      window.focus();
    });
  });

  return window;
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (state.mainWindow === null) {
    state.mainWindow = createMainWindow();
    const menuBuilder = new MainMenuBuilder(state.mainWindow);
    menuBuilder.buildMenu();
  }
  state.mainWindow.show();
  state.mainWindow.focus();
});

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (state.mainWindow) {
      if (state.mainWindow.isMinimized()) state.mainWindow.restore();
      state.mainWindow.focus();
    }
  });

  app.on("ready", () => {
    const pathToNotes = path.join(app.getPath("userData"), "notes");
    if (!fs.existsSync(pathToNotes)) {
      fs.mkdirSync(pathToNotes);
    }

    let separator = "";
    if (is.macos) {
      separator = "..";
    }

    asyncCopyFile(
      path.join(
        path.dirname(app.getAppPath()),
        separator,
        `static/👉 Read This First 👈.md`
      ),
      path.join(pathToNotes, "👉 Read This First 👈.md"),
      COPYFILE_EXCL
    ).catch(err => {
      if (err) {
        console.error(err);
      }
    });

    // Here we set the initial preferences !!!
    const store = new Store();
    if (!store.has("path")) {
      const directoryPath = path.join(app.getPath("userData"), "notes");
      store.set("path", directoryPath);
    }
    if (!store.has("fontSize")) {
      store.set("fontSize", 14);
    }
    if (!store.has("shortcut")) {
      store.set("shortcut", "CommandOrControl+Shift+L");
    }

    state.mainWindow = createMainWindow();
    const menuBuilder = new MainMenuBuilder(state.mainWindow);
    menuBuilder.buildMenu();

    const shortcut = store.get("shortcut");
    registerGlobalShortcut(shortcut);
  });
}

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

// ///////////////////////////////////////////////////////////////////////////
// IPC MAIN CALLS
// ///////////////////////////////////////////////////////////////////////////

ipcMain.on("open-editor", (_, payload) => {
  validateObject(payload, {
    noteContents: Joi.string().allow(""),
    noteFileName: Joi.string().trim(),
    noteTitle: Joi.string()
      .trim()
      .min(1)
  });

  const { noteTitle } = payload;
  const editor = state.openEditors.find(e => e.noteTitle === noteTitle);

  if (editor) {
    editor.editorWindow.focus();
  } else {
    const editorWindow = createEditorWindow(noteTitle);
    editorWindow.editorProps = payload;
    state.openEditors.push({
      editorWindow,
      ...payload
    });
  }
});

ipcMain.on("update-editor-title", (_, { title, newTitle, newFileName }) => {
  // TODO: I think we need stronger guarantees here that the state is consistent
  const editor = state.openEditors.find(e => e.noteTitle === title);
  if (editor) {
    editor.noteTitle = newTitle;
    editor.noteFileName = newFileName;
    editor.editorWindow.setTitle(newTitle);
    editor.editorWindow.editorProps = {
      noteTitle: newTitle,
      noteFileName: newFileName
    };
    state.openEditors = state.openEditors.filter(e => e.noteTitle !== title);
  }
});

ipcMain.on("delete-editor", (_, { title }) => {
  const editor = state.openEditors.find(e => e.noteTitle === title);
  if (editor) {
    editor.editorWindow.close();
    state.openEditors = state.openEditors.filter(e => e.noteTitle !== title);
  }
});

/*
 * We do this on the main thread, even though we have a reference to the mainWindow
 * on the renderer thread because the performace is better this way
 */
ipcMain.on("search-input-change", (_, { searchListLength }) => {
  const [width] = state.mainWindow.getContentSize();
  let height = SEARCHBAR_HEIGHT + ITEM_HEIGHT * searchListLength;
  state.searchListLength = searchListLength;
  // the 5 is for the bottom edge
  height = searchListLength === 0 ? height : height + 5;

  state.mainWindow.setContentSize(width, height, true);
});

ipcMain.on("update-shortcut", (event, { shortcut }) => {
  try {
    globalShortcut.unregisterAll();
    const ret = registerGlobalShortcut(shortcut);
    if (!ret) {
      state.mainWindow.webContents.send("update-shortcut-failure", true);
      return;
    }

    const store = new Store();
    store.set("shortcut", shortcut);
    state.mainWindow.webContents.send("update-shortcut-success", { shortcut });
  } catch (e) {
    state.mainWindow.webContents.send("update-shortcut-failure", true);
  }
});

ipcMain.on("preferences-open", () => {
  const [_, height] = state.mainWindow.getContentSize();

  if (height < 375) {
    state.mainWindow.setContentSize(420, 375, true);
  }
});

ipcMain.on("preferences-closed", () => {
  const { searchListLength } = state;

  // TODO: this is copied from the `search-input-change` listener. Unify the implementation
  let height = SEARCHBAR_HEIGHT + ITEM_HEIGHT * searchListLength;

  // the 5 is for the bottom edge
  height = searchListLength === 0 ? height : height + 5;
  state.mainWindow.setContentSize(420, height, true);
});

process.on("uncaughtException", err => {
  log.error(err);
});
