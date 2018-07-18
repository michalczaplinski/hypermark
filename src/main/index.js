import {
  app,
  BrowserWindow,
  ipcMain,
  globalShortcut,
  Menu,
  MenuItem
} from "electron";
import { format as formatUrl } from "url";
import * as path from "path";

import MenuBuilder from "../menu";

// global reference to mainWindow (necessary to prevent window from being garbage collected)
let mainWindow;
let editorWindow;

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
  const window = new BrowserWindow({
    width: 420,
    height: 520,
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
    editorWindow = null;
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
  if (mainWindow === null) {
    mainWindow = createMainWindow();
  }
});

app.on("ready", () => {
  mainWindow = createMainWindow();
  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  const ret = globalShortcut.register("CommandOrControl+Shift+L", () => {
    if (!mainWindow) {
      mainWindow = createMainWindow();
    } else {
      mainWindow.focus();
    }
  });

  if (!ret) {
    console.log("registration failed");
  }
});

app.on("will-quit", () => {
  globalShortcut.unregister("CommandOrControl+Shift+L");
  globalShortcut.unregisterAll();
});

ipcMain.on("open-editor", (event, payload) => {
  editorWindow = createEditorWindow(payload.noteTitle);

  // const menuBuilder = new MenuBuilder(editorWindow, mainWindow);
  // menuBuilder.buildMenu();

  editorWindow.focus();
  editorWindow.editorProps = payload;
});
