import React from "react";
import ReactDOM from "react-dom";
import * as Mousetrap from "mousetrap";
import * as path from "path";

import { format as formatUrl } from "url";

import "./index.css";
import App from "./App";

const { BrowserWindow } = require("electron").remote;

Mousetrap.bind("command+shift+k", () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600
  });
  win.loadURL(
    formatUrl({
      pathname: path.resolve(__dirname, "editor.html"),
      protocol: "file",
      slashes: true
    })
  );
});

ReactDOM.render(<App />, document.body);
