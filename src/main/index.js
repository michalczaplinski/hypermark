import { app, BrowserWindow, ipcMain, globalShortcut } from "electron"; //eslint-disable-line
import Joi from "joi";
import { format as formatUrl } from "url";
import path from "path";

import { validateObject } from "../util";
import MainMenuBuilder from "../menu";

const state = {
  mainWindow: undefined,
  lastWindowPosition: undefined,
  openEditors: {}
};

const isDevelopment = process.env.NODE_ENV !== "production";

function createMainWindow() {
  const window = new BrowserWindow({ width: 400, height: 500, frame: false });

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
    width: 420,
    height: 520,
    minWidth: 200,
    webPreferences: { webSecurity: false },
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

  window.on("closed", () => {
    if (state.openEditors[title]) {
      delete state.openEditors[title];
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

app.on("ready", () => {
  state.mainWindow = createMainWindow();
  let menuBuilder = new MainMenuBuilder(state.mainWindow);
  menuBuilder.buildMenu();

  const ret = globalShortcut.register("CommandOrControl+Shift+L", () => {
    if (!state.mainWindow) {
      state.mainWindow = createMainWindow();
      menuBuilder = new MainMenuBuilder(state.mainWindow);
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

  if (!ret) {
    console.error("registration failed");
  }
});

app.on("will-quit", () => {
  globalShortcut.unregister("CommandOrControl+Shift+L");
  globalShortcut.unregister("CommandOrControl+Shift+Z");
  globalShortcut.unregisterAll();
});

ipcMain.on("open-editor", (_, payload) => {
  validateObject(payload, {
    noteContents: Joi.string().allow(""),
    noteFileName: Joi.string().trim(),
    noteTitle: Joi.string()
      .trim()
      .min(1)
  });

  const { noteTitle } = payload;
  if (state.openEditors[noteTitle]) {
    state.openEditors[noteTitle].editorWindow.focus();
  } else {
    const editorWindow = createEditorWindow(noteTitle);
    editorWindow.editorProps = payload;
    state.openEditors[noteTitle] = {
      editorWindow,
      ...payload
    };
  }
});

ipcMain.on("update-editor-title", (_, { title, newTitle }) => {
  // TODO: I think we need stronger guarantees here that the state is consistent
  if (state.openEditors[title]) {
    state.openEditors[newTitle] = state.openEditors[title];
    state.openEditors[newTitle].noteTitle = newTitle;
    state.openEditors[newTitle].editorWindow.setTitle(newTitle);
    delete state.openEditors[title];
  }
});

ipcMain.on("delete-editor", (_, { title }) => {
  if (state.openEditors[title]) {
    state.openEditors[title].editorWindow.close();
    delete state.openEditors[title];
  }
});
