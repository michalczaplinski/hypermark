import React from "react";
import { format as formatUrl } from "url";
import styled from "styled-components";
import * as Mousetrap from "mousetrap";
import * as path from "path";

import "./../style/index.css";

const { BrowserWindow } = require("electron").remote;

const Search = styled.input`
  width: 100%;
  height: 70px;
  margin: 0px;
  padding: 5px;
  font-size: 17px;
  border: transparent;
  border-radius: 3px;
  display: block;
`;

class Main extends React.Component {
  componentDidMount() {
    Mousetrap.bind("command+shift+k", () => {
      const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: { webSecurity: false }
      });

      const isDevelopment = process.env.NODE_ENV !== "production";
      if (isDevelopment) {
        win.loadURL(
          `http://localhost:${process.env.ELECTRON_WEBPACK_WDS_PORT}?editor`
        );
      } else {
        win.loadURL(`file:///${__dirname}/index.html?editor`);
        win.webContents.openDevTools();
      }
    });
  }

  render() {
    return (
      <div>
        <Search />
      </div>
    );
  }
}

export default Main;
