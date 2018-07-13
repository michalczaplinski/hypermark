import React from "react";
import styled from "styled-components";
import * as Mousetrap from "mousetrap";

import { asyncFilter } from "../../util";

const { BrowserWindow } = require("electron").remote;
const { promisify } = require("util");
const os = require("os");
const path = require("path");
const fs = require("fs");

const asyncReadFile = promisify(fs.readFile);
const asyncReaddir = promisify(fs.readdir);

const Search = styled.input`
  width: 100%;
  height: 70px;
  margin: 0px;
  padding: 5px;
  font-size: 17px;
  border: transparent;
  border-radius: 3px;
  display: block;

  &:focus {
    outline-offset: 0px;
    outline: none;
  }
`;

const File = styled.div`
  height: 70px;
  width: 100%;
  background-color: lightgreen;
  padding: 10px;
  text-align: center;

  transition: all 150ms ease;

  &:hover {
    cursor: pointer;
    background-color: lightblue;
  }
`;

const directoryPath = path.join(os.homedir(), "Documents");

class Main extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      allFiles: [],
      currentFiles: []
    };

    this.scanForFiles()
      .then(files => {
        this.setState({ allFiles: files, currentFiles: files });
      })
      .catch(e => console.error(e));
  }

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
        if (process.env.DEBUG_PROD === "true") {
          win.webContents.openDevTools();
        }
      }
    });
  }

  scanForFiles = async () => {
    // TODO: allow setting the directory
    const markdownFiles = [];
    try {
      const files = await asyncReaddir(directoryPath);
      files.forEach(file => {
        if (path.extname(file) === ".md") {
          markdownFiles.push(file);
        }
      });
    } catch (err) {
      console.error(`Unable to scan directory: ${err}`);
    }
    return markdownFiles;
  };

  search = async value => {
    const { allFiles } = this.state;

    const newFiles = await asyncFilter(allFiles, async file => {
      const hasValue = await this.hasValue(value.trim(), file);
      return hasValue;
    });

    this.setState({ currentFiles: newFiles });
  };

  hasValue = async (searchValue, file) => {
    try {
      const fileContents = await asyncReadFile(
        path.join(directoryPath, file),
        "utf8"
      );
      if (fileContents.indexOf(searchValue) !== -1) {
        return true;
      }
    } catch (error) {
      console.error(`Unable to read file: ${file}`);
    }
    return false;
  };

  render() {
    const { currentFiles } = this.state;

    return (
      <div>
        <Search
          autoFocus
          type="text"
          onChange={e => this.search(e.target.value)}
        />
        <div>{currentFiles.map(file => <File key={file}> {file} </File>)}</div>
      </div>
    );
  }
}

export default Main;
