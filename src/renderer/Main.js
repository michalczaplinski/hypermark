import React from "react";
import * as Mousetrap from "mousetrap";
import * as path from "path";

import { format as formatUrl } from "url";

import "./../style/index.css";

const { BrowserWindow } = require("electron").remote;

const isDevelopment = process.env.NODE_ENV !== "production";

const Main = class extends React.Component {
  componentDidMount() {
    Mousetrap.bind("command+shift+k", () => {
      const win = new BrowserWindow({
        width: 800,
        height: 600
      });

      if (isDevelopment) {
        win.loadURL(
          `http://localhost:${process.env.ELECTRON_WEBPACK_WDS_PORT}/?editor`
        );
      } else {
        win.loadURL(
          formatUrl({
            pathname: path.join(__dirname, "index.html/?editor"),
            protocol: "file",
            slashes: true
          })
        );
      }
    });
  }

  render() {
    return <div> hello </div>;
  }
};

export default Main;
