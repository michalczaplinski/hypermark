import { app, BrowserWindow, ipcMain, globalShortcut } from "electron"; //eslint-disable-line
import Joi from "joi";
import { format as formatUrl } from "url";
import path from "path";

import { validateObject } from "../util";
import MainMenuBuilder from "../menu";

const openEditors = {};

let mainWindow;
let editorWindow;
let lastWindowPosition;

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
    console.log("window closed");
    mainWindow = null;
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
  let [x, y] = mainWindow.getPosition();
  switch (lastWindowPosition) {
    case "leftTop":
      [x, y] = [x + 100, y - 100];
      lastWindowPosition = "rightTop";
      break;
    case "rightTop":
      [x, y] = [x + 100, y + 100];
      lastWindowPosition = "rightBottom";
      break;
    case "rightBottom":
      [x, y] = [x - 100, y + 100];
      lastWindowPosition = "leftBottom";
      break;
    case "leftBottom":
      [x, y] = [x - 100, y - 100];
      lastWindowPosition = "leftTop";
      break;
    default:
      [x, y] = [x + 100, y - 100];
      lastWindowPosition = "rightTop";
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
    delete openEditors[title];
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
  console.log("app window-all-closed");
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  console.log("app activate");
  if (mainWindow === null) {
    console.log("activate and window is null");
    mainWindow = createMainWindow();
    const menuBuilder = new MainMenuBuilder(mainWindow);
    menuBuilder.buildMenu();
  }
  mainWindow.show();
  mainWindow.focus();
});

app.on("ready", () => {
  console.log("app ready");
  mainWindow = createMainWindow();
  let menuBuilder = new MainMenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  const ret = globalShortcut.register("CommandOrControl+Shift+L", () => {
    if (!mainWindow) {
      mainWindow = createMainWindow();
      menuBuilder = new MainMenuBuilder(mainWindow);
      menuBuilder.buildMenu();
    } else if (mainWindow.isVisible() && !mainWindow.isFocused()) {
      mainWindow.focus();
    } else if (mainWindow.isVisible() && mainWindow.isFocused()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  if (!ret) {
    console.log("registration failed");
  }
});

app.on("will-quit", () => {
  console.log("app will-quit");
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
  if (openEditors[noteTitle]) {
    openEditors[noteTitle].editorWindow.focus();
  } else {
    editorWindow = createEditorWindow(noteTitle);
    openEditors[noteTitle] = {
      editorWindow,
      ...payload
    };
  }
  editorWindow.editorProps = payload;
});
