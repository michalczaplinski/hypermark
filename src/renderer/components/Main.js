import React, { Component } from "react";
import styled from "styled-components";

import { asyncFilter } from "../../util";
import { ipcRenderer } from "electron";

import { promisify } from "util";

import * as os from "os";
import * as path from "path";
import * as fs from "fs";

const asyncReadFile = promisify(fs.readFile);
const asyncReaddir = promisify(fs.readdir);
const asyncStat = promisify(fs.stat)

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
  margin: 3px;
  font-size: 17px;
  text-align: center;
  border: none;
  transition: all 150ms ease;
  border-radius: 3px;

  &:hover {
    cursor: pointer;
    background-color: lightblue;
  }

  &:focus {
    cursor: pointer;
    background-color: lightblue;
  }
`;

class Main extends Component {

  constructor(props) {
    super(props);
    this.state = {
      allNotes: [],
      currentSearchNotes: [],
      searchValue: ""
    };
    this.input = React.createRef();

    this.scanForNotes()
      .then(notes => {
        this.setState({ allNotes: notes, currentSearchNotes: notes });
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
    const noteTitle = noteFileName.slice(0, -3);
    ipcRenderer.send("open-editor", { noteContents, noteFileName, noteTitle });
  }

  scanForNotes = async () =>  {
    try {
      const files = await asyncReaddir(directoryPath);
      const promiseOfFiles = files
        .filter(file => path.extname(file) === '.md')
        .map(file => {
          return asyncStat(path.join(directoryPath, file))
            .then(stats => ({ file, lastModified: stats.mtimeMs }))
            .catch(err => { throw err })
          })
        
      return await Promise.all(promiseOfFiles)

    } catch (err) {
      // TODO: fix error handling here
      console.error(`Unable to scan directory: ${err}`);
    }
  };

  search = async value =>  {
    const { allNotes } = this.state;

    const newNotes = await asyncFilter(allNotes, async note => {
      const hasValue = await this.hasValue(value.trim(), note);
      return hasValue;
    });

    this.setState({ searchValue: value, currentSearchNotes: newNotes });
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
    if (noteName === "") {
      return;
    }

    fs.writeFile(
      path.join(directoryPath, `${noteName}.md`),
      "",
      { flag: "wx+" },
      err => {
        if (err) {
          if (err.code === "EEXIST") {
            console.error("myfile already exists");
            return;
          }

          throw err;
        }

        this.openNote(`${noteName}.md`);
        this.scanForNotes().then(notes =>
          this.setState({ currentSearchNotes: notes })
        );
      }
    );
  };

  render() {
    const { currentSearchNotes } = this.state;

    return (
      <div>
        <TopBarWrapper>
          <Search
            autoFocus={true}
            type="text"
            innerRef={this.input}
            onChange={e => this.search(e.target.value)}
            onKeyDown={e => {
              if (e.which === 13 && currentSearchNotes.length > 0) {
                this.openNote(currentSearchNotes[0].file);
              } else if (e.which === 13 && currentSearchNotes.length === 0) {
                this.createNewNote();
              }
            }}
          />
          <AddNote onClick={() => this.createNewNote()}> + </AddNote>
        </TopBarWrapper>
        <div>
          {currentSearchNotes.map(note => (
            <File key={note.file} onClick={() => this.openNote(note.file)}>
              {/* TODO: There is probably a smarter way to do this */}
              {note.file.slice(0, -3)}
            </File>
          ))}
        </div>
      </div>
    );
  }
}

export default Main;
