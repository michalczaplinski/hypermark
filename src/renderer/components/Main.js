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

const TopBarWrapper = styled.div`
  display: flex;
  flex-flow: row nowrap;
  width: 100%;
  height: 70px;
  margin-bottom: 5px;
`;

const Search = styled.input`
  flex: 1;
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

const AddNote = styled.button`
  display: block;
  height: 70px;
  width: 70px;
  border: none;
  border-radius: 3px;
  margin: 0;
  padding: 5px;
  background-color: lightgoldenrodyellow;
  font-size: 35px;

  &:hover {
    cursor: pointer;
    background-color: lightblue;
  }
  &:focus {
    cursor: pointer;
    background-color: lightblue;
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
      searchValue: "",
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

  openNote = async noteFileName => {
    const location = path.join(directoryPath, noteFileName);
    const noteContents = await asyncReadFile(location, "utf8");
    ipcRenderer.send("open-editor", { noteContents, noteFileName });
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

    this.setState({ searchValue: value, currentNotes: newNotes });
  };

  hasValue = async (searchValue, note) => {
    try {
      const noteContents = await asyncReadFile(
        path.join(directoryPath, note),
        "utf8"
      );
      if (noteContents.concat(note).indexOf(searchValue) !== -1) {
        return true;
      }
    } catch (error) {
      console.error(`Unable to read note: ${note}`);
    }
    return false;
  };

  createNewNote = () => {
    const noteName = this.state.searchValue;

    fs.writeFile(
      path.join(directoryPath, `${noteName}.md`),
      "",
      { flag: "wx+" },
      (err, fd) => {
        if (err) {
          if (err.code === "EEXIST") {
            console.error("myfile already exists");
            return;
          }

          throw err;
        }

        this.openNote(`${noteName}.md`);
        this.scanForNotes().then(notes =>
          this.setState({ currentNotes: notes })
        );
      }
    );
  };

  render() {
    const { currentNotes } = this.state;

    return (
      <div>
        <TopBarWrapper>
          <Search
            autoFocus
            type="text"
            innerRef={this.input}
            onChange={e => this.search(e.target.value)}
            onKeyDown={e => {
              if (e.which === 13 && currentNotes.length > 0) {
                this.openNote(currentNotes[0]);
              } else if (e.which === 13 && currentNotes.length === 0) {
                this.createNewNote();
              }
            }}
          />
          <AddNote onClick={() => this.createNewNote()}> + </AddNote>
        </TopBarWrapper>
        <div>
          {currentNotes.map(note => (
            <File key={note} onClick={() => this.openNote(note)}>
              {note}
            </File>
          ))}
        </div>
      </div>
    );
  }
}

export default Main;
