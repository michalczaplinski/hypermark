import { app, BrowserWindow, ipcMain, globalShortcut, shell } from "electron";
import { format as formatUrl } from "url";
import Store from "electron-store";
import path from "path";
import fs from "fs";
import { promisify } from "util";
import { is } from "electron-util";
import log from "electron-log";

import MainMenuBuilder from "../menu";
import assert from "assert";

require("electron-context-menu")();

const { COPYFILE_EXCL } = fs.constants;
const asyncCopyFile = promisify(fs.copyFile);
const store = new Store();

const state = {
  mainWindow: undefined,
  lastWindowPosition: undefined,
  openEditors: [],
  searchListLength: 5, // this is the initial number of items
};

const SEARCHBAR_HEIGHT = 70;
const ITEM_HEIGHT = 60;

const isDevelopment = process.env.NODE_ENV !== "production";

function copyReadmeFile() {
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
  ).catch((err) => {
    if (err) {
      console.error(err);
    }
  });
}

function createMainWindow() {
  const window = new BrowserWindow({
    width: 420,
    height: SEARCHBAR_HEIGHT + ITEM_HEIGHT * 5 + 5,
    maxHeight: SEARCHBAR_HEIGHT + ITEM_HEIGHT * 6 + 5,
    frame: false,
    fullscreenable: false,
    disableAutoHideCursor: true,
    show: false,
    resizable: isDevelopment,
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
      worldSafeExecuteJavaScript: true,
    },
  });

  if (isDevelopment || process.env.DEBUG_PROD === "true") {
    window.setSize(900, 600);
    window.setMaximumSize(1000, 1000);
    window.webContents.openDevTools();
  }

  if (isDevelopment) {
    window.loadURL(`http://localhost:${process.env.ELECTRON_WEBPACK_WDS_PORT}`);
  } else {
    window.loadURL(
      formatUrl({
        pathname: path.join(__dirname, "index.html"),
        protocol: "file",
        slashes: true,
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
  if (!store.has("openedWindows")) {
    store.set("openedWindows", []);
  }

  const openedWindows = store.get("openedWindows", []);
  const editorWindow = openedWindows.find((win) => win.title === title);

  let x;
  let y;
  let width = 565;
  let height = 480;

  if (editorWindow) {
    x = editorWindow.x;
    y = editorWindow.y;
    width = editorWindow.width;
    height = editorWindow.height;
  } else {
    openedWindows.push({ x, y, width, height, title });
    store.set("openedWindows", openedWindows);

    [x, y] = state.mainWindow.getPosition();
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
  }

  const window = new BrowserWindow({
    x,
    y,
    width,
    height,
    minWidth: 200,
    title,
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
      worldSafeExecuteJavaScript: true,
    },
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

  window.on("close", (event) => {
    const editor = state.openEditors.find(
      (e) => e.noteTitle === event.sender.editorProps.noteTitle
    );

    if (editor) {
      const [width, height] = editor.editorWindow.getContentSize();
      const [x, y] = editor.editorWindow.getPosition();

      const openedWindows = store.get("openedWindows", []);
      const index = openedWindows.findIndex((e) => e.title === title);

      if (index !== -1) {
        openedWindows[index] = { x, y, width, height, title };
        store.set("openedWindows", openedWindows);
      }

      editor.editorWindow = null;
      state.openEditors = state.openEditors.filter(
        (e) => e.noteTitle !== event.sender.editorProps.noteTitle
      );
    }
  });

  window.webContents.on("devtools-opened", () => {
    window.focus();
    setImmediate(() => {
      window.focus();
    });
  });

  window.webContents.on("new-window", (e, url) => {
    if (url !== window.webContents.getURL()) {
      e.preventDefault();
      shell.openExternal(url);
    }
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
  app.on("second-instance", () => {
    // Someone tried to run a second instance, we should focus our window.
    if (state.mainWindow) {
      if (state.mainWindow.isMinimized()) state.mainWindow.restore();
      state.mainWindow.focus();
    }
  });

  app.on("ready", () => {
    if (!isDevelopment) {
      copyReadmeFile();
    }

    // Here we set the initial preferences !!!
    if (!store.has("directoryPath")) {
      const directoryPath = path.join(app.getPath("userData"), "notes");
      store.set("directoryPath", directoryPath);
    }
    if (!store.has("fontSize")) {
      store.set("fontSize", 14);
    }
    if (!store.has("shortcut")) {
      store.set("shortcut", "CommandOrControl+Shift+L");
    }
    if (!store.has("showOfflineWarning")) {
      store.set("showOfflineWarning", true);
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
  const { noteContents, noteFileName, noteTitle } = payload;

  assert(typeof noteContents === "string");
  assert(typeof noteFileName === "string");
  assert(typeof noteTitle === "string");
  assert(noteTitle.trim().length > 1);

  const editor = state.openEditors.find((e) => e.noteTitle === noteTitle);

  if (editor) {
    editor.editorWindow.focus();
  } else {
    const editorWindow = createEditorWindow(noteTitle);
    editorWindow.editorProps = payload;
    state.openEditors.push({
      editorWindow,
      ...payload,
    });
  }
});

ipcMain.on("update-editor-title", (_, { title, newTitle, newFileName }) => {
  // TODO: I think we need stronger guarantees here that the state is consistent
  const editor = state.openEditors.find((e) => e.noteTitle === title);
  if (editor) {
    editor.noteTitle = newTitle;
    editor.noteFileName = newFileName;
    editor.editorWindow.setTitle(newTitle);
    editor.editorWindow.editorProps = {
      noteTitle: newTitle,
      noteFileName: newFileName,
    };
    state.openEditors = state.openEditors.filter((e) => e.noteTitle !== title);
  }
});

ipcMain.on("delete-editor", (_, { title }) => {
  const editor = state.openEditors.find((e) => e.noteTitle === title);
  if (editor) {
    editor.editorWindow.close();
    state.openEditors = state.openEditors.filter((e) => e.noteTitle !== title);
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

    store.set("shortcut", shortcut);
    state.mainWindow.webContents.send("update-shortcut-success", { shortcut });
  } catch (e) {
    state.mainWindow.webContents.send("update-shortcut-failure", true);
  }
});

ipcMain.on("preferences-open", () => {
  const [, height] = state.mainWindow.getContentSize();

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

process.on("uncaughtException", (err) => {
  log.error(err);
});
