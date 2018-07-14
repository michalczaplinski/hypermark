import React from "react";
import styled from "styled-components";

import { asyncFilter } from "../../util";
import { ipcRenderer } from "electron";

const { promisify } = require("util");
const os = require("os");
const path = require("path");
const fs = require("fs");

const asyncReadFile = promisify(fs.readFile);
const asyncReaddir = promisify(fs.readdir);

// SOME FLAGS
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

const File = styled.button`
  display: block;
  height: 70px;
  width: 100%;
  background-color: lightgreen;
  padding: 10px;
  font-size: 17px;
  text-align: center;
  border: none;
  transition: all 150ms ease;

  &:hover {
    cursor: pointer;
    background-color: lightblue;
  }

  &:focus {
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
    this.input = React.createRef();

    this.scanForNotes()
      .then(notes => {
        this.setState({ allNotes: notes, currentNotes: notes });
      })
      .catch(e => console.error(e));
  }

  componentDidMount() {
    if (this.input.current) {
      this.input.current.focus();
    }
  }

  openNote = async location => {
    const noteContents = await asyncReadFile(location, "utf8");
    ipcRenderer.send("open-editor", { noteContents });
  };

  scanForNotes = async () => {
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
          innerRef={this.input}
          onChange={e => this.search(e.target.value)}
        />
        <div>
          {currentNotes.map(note => (
            <File
              key={note}
              onClick={() => this.openNote(path.join(directoryPath, note))}
            >
              {note}
            </File>
          ))}
        </div>
      </div>
    );
  }
}

export default Main;
