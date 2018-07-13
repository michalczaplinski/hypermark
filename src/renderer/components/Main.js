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

const directoryPath = path.join(os.homedir(), "Documents");

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

class Main extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      allNotes: [],
      currentNotes: []
    };

    this.scanForNotes()
      .then(notes => {
        this.setState({ allNotes: notes, currentNotes: notes });
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

  openFile = async () => {};

  scanForNotes = async () => {
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
    const { allNotes } = this.state;

    const newNotes = await asyncFilter(allNotes, async note => {
      const hasValue = await this.hasValue(value.trim(), note);
      return hasValue;
    });

    this.setState({ currentNotes: newNotes });
  };

  hasValue = async (searchValue, note) => {
    try {
      const noteContents = await asyncReadFile(
        path.join(directoryPath, note),
        "utf8"
      );
      if (noteContents.indexOf(searchValue) !== -1) {
        return true;
      }
    } catch (error) {
      console.error(`Unable to read note: ${note}`);
    }
    return false;
  };

  render() {
    const { currentNotes } = this.state;

    return (
      <div>
        <Search
          autoFocus
          type="text"
          onChange={e => this.search(e.target.value)}
        />
        <div>{currentNotes.map(note => <File key={note}> {note} </File>)}</div>
      </div>
    );
  }
}

export default Main;
