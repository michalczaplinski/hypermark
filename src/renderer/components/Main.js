import React, { Component } from "react";
import styled from "styled-components";
import { ipcRenderer } from "electron"; //eslint-disable-line
import { orderBy } from "lodash";
import moment from "moment";

import { promisify } from "util";
import path from "path";
import fs from "fs";

import globalState from "../../globals";

const asyncReadFile = promisify(fs.readFile);
const asyncReaddir = promisify(fs.readdir);
const asyncStat = promisify(fs.stat);

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
      allNotes: [], // [{ noteFileName, lastModified }]
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
    ipcRenderer.on("focus", () => {
      this.input.current.focus();
      this.scanForNotes()
        .then(notes => {
          this.setState({ allNotes: notes });
          return this.search(this.state.searchValue, notes);
        })
        .then(notes => {
          this.setState({ currentSearchNotes: notes });
        })
        .catch(e => console.error(e));
    });

    if (this.input.current) {
      this.input.current.focus();
    }
  }

  openNote = async noteFileName => {
    const location = path.join(globalState.directoryPath, noteFileName);
    const noteContents = await asyncReadFile(location, "utf8");
    const noteTitle = noteFileName.slice(0, -3);
    ipcRenderer.send("open-editor", { noteContents, noteFileName, noteTitle });
  };

  scanForNotes = async () => {
    try {
      const files = await asyncReaddir(globalState.directoryPath);
      const promiseOfFiles = files
        .filter(noteFileName => path.extname(noteFileName) === ".md")
        .map(noteFileName =>
          asyncStat(path.join(globalState.directoryPath, noteFileName))
            .then(stats => ({ noteFileName, lastModified: stats.mtimeMs }))
            .catch(err => {
              throw err;
            })
        );

      return Promise.all(promiseOfFiles);
    } catch (err) {
      // TODO: fix error handling here
      console.error(`Unable to scan directory: ${err}`);
    }
  };

  searchWrapper = async searchValue => {
    const { allNotes } = this.state;
    this.setState({ searchValue });
    const currentSearchNotes = await this.search(searchValue, allNotes);
    this.setState({ currentSearchNotes });
  };

  search = async (searchValue, allNotes) => {
    const newNotesPromises = allNotes.map(
      async ({ noteFileName, ...rest }) => ({
        noteFileName,
        ...(await this.hasValue(
          searchValue.trim().toLowerCase(),
          noteFileName
        )),
        ...rest
      })
    );

    const newNotes = await Promise.all(newNotesPromises);
    const currentSearchNotes = newNotes.filter(({ hasValue }) => hasValue);
    return currentSearchNotes;
  };

  hasValue = async (searchValue, noteFileName) => {
    try {
      const noteContents = await asyncReadFile(
        path.join(globalState.directoryPath, noteFileName),
        "utf8"
      );
      const valueRegex = new RegExp(searchValue, "i");
      const indexOfValue = noteContents.search(valueRegex);
      const indexOfValueInTitle = noteFileName.search(valueRegex);

      if (indexOfValueInTitle !== -1) {
        return {
          hasValue: true,
          indexOfValueInTitle,
          indexOfValue: null
        };
      }

      if (indexOfValue !== -1) {
        return {
          hasValue: true,
          indexOfValueInTitle: null,
          indexOfValue
        };
      }
    } catch (error) {
      console.error(`Unable to read note: ${noteFileName}`);
    }
    return {
      hasValue: false,
      indexOfValueInTitle: null,
      indexOfValue: null
    };
  };

  createNewNote = () => {
    const noteName = this.state.searchValue;
    if (noteName === "") {
      return;
    }

    fs.writeFile(
      path.join(globalState.directoryPath, `${noteName}.md`),
      "",
      { flag: "wx+" },
      err => {
        if (err) {
          if (err.code === "EEXIST") {
            console.error(`"${noteName}" already exists`);
            return;
          }
          throw err;
        }

        this.openNote(`${noteName}.md`);
        this.scanForNotes()
          .then(notes => {
            this.setState({ allNotes: notes });
            return this.search(this.state.searchValue, notes);
          })
          .then(notes => {
            this.setState({ currentSearchNotes: notes });
          })
          .catch(e => console.error(e));
      }
    );
  };

  render() {
    const { currentSearchNotes } = this.state;

    const notes = orderBy(
      currentSearchNotes,
      ["indexOfValueInTitle", "indexOfValue", "lastModified"],
      ["asc", "asc", "desc"]
    );

    return (
      <div>
        <TopBarWrapper>
          <Search
            autoFocus
            type="text"
            innerRef={this.input}
            onChange={e => this.searchWrapper(e.target.value)}
            onKeyDown={e => {
              if (e.which === 13 && notes.length > 0) {
                this.openNote(notes[0].noteFileName);
              } else if (e.which === 13 && notes.length === 0) {
                this.createNewNote();
              }
            }}
          />
          <AddNote onClick={() => this.createNewNote()}> + </AddNote>
        </TopBarWrapper>
        <div>
          {notes.map(note => (
            <File
              key={note.noteFileName}
              onClick={() => this.openNote(note.noteFileName)}
            >
              {/* TODO: There is probably a smarter way to do this */}
              {note.noteFileName.slice(0, -3)}{" "}
              <span>
                {moment(note.lastModified).isAfter(moment().subtract(1, "days"))
                  ? moment(note.lastModified).fromNow()
                  : moment(note.lastModified).format("MMMM Do YYYY, h:mma")}
              </span>{" "}
              title: {note.indexOfValueInTitle}
              content: {note.indexOfValue}
            </File>
          ))}
        </div>
      </div>
    );
  }
}

export default Main;
