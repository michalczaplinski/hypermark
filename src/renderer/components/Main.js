import React, { Component } from "react";
import styled from "styled-components";
import { ipcRenderer,  remote } from "electron"; //eslint-disable-line
import { orderBy } from "lodash";
import moment from "moment";
import Mousetrap from "mousetrap";

import { promisify } from "util";
import path from "path";
import fs from "fs";

import globalState from "../../globals";

const asyncReadFile = promisify(fs.readFile);
const asyncReaddir = promisify(fs.readdir);
const asyncStat = promisify(fs.stat);
const asyncRmFile = promisify(fs.unlink);
const asyncWriteFile = promisify(fs.writeFile);
const asyncRename = promisify(fs.rename);

class UndoStack {
  constructor(timeout) {
    this.stack = [];
    this.timeout = timeout;
  }

  push(note) {
    return this.stack.push(note);
  }

  undo() {
    const undoFunc = this.stack.pop();
    try {
      undoFunc();
    } catch (e) {
      console.warn("nothing left on the stack");
    }
  }
}

const undoStack = new UndoStack();

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

const File = styled.div`
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
      allNotes: [],
      currentSearchNotes: [],
      searchValue: "",
      indexOfNoteBeingRenamed: undefined
    };
    this.input = React.createRef();
    this.mainWindow = remote.getCurrentWindow();

    this.scanForNotes();
  }

  componentDidMount() {
    Mousetrap.bind("esc", () => {
      this.mainWindow.hide();
    });
    Mousetrap.bind(["command+z", "ctrl+z"], () => {
      undoStack.undo();
    });
    Mousetrap.bind("command+l", () => {
      this.input.current.focus();
    });
    ipcRenderer.on("focus", () => {
      this.input.current.focus();
      this.scanForNotes();
    });

    if (this.input.current) {
      this.input.current.focus();
    }
  }

  scanForNotes = async () => {
    const { searchValue } = this.state;
    try {
      const files = await asyncReaddir(globalState.directoryPath);
      const promiseOfFiles = files
        .filter(noteFileName => path.extname(noteFileName) === ".md")
        .map(noteFileName =>
          asyncStat(path.join(globalState.directoryPath, noteFileName))
            .then(stats => ({
              noteName: noteFileName.replace(/\.md$/, ""),
              noteFileName,
              lastModified: stats.mtimeMs
            }))
            .catch(err => {
              throw err;
            })
        );

      const allNotes = await Promise.all(promiseOfFiles);
      this.setState({ allNotes });
      const currentSearchNotes = await this.search(searchValue, allNotes);
      this.setState({ currentSearchNotes });
    } catch (err) {
      // TODO: fix error handling here
      console.error(`Error while scanning for notes: ${err}`);
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

  createNewNote = (noteName, noteContents) => {
    if (noteName === "") {
      return;
    }

    let contents = "";
    if (typeof noteContents === "string") {
      contents = noteContents;
    }

    return asyncWriteFile(
      path.join(globalState.directoryPath, `${noteName}.md`),
      contents,
      { flag: "wx+" }
    )
      .then(() => {
        this.scanForNotes();
      })
      .catch(err => {
        if (err) {
          if (err.code === "EEXIST") {
            console.error(`"${noteName}" already exists`);
            return;
          }
          throw err;
        }
      });
  };

  deleteNote = async noteName => {
    const noteFileName = `${noteName}.md`;
    const location = path.join(globalState.directoryPath, noteFileName);
    const noteContents = await asyncReadFile(location, "utf8");

    undoStack.push(() => this.createNewNote(noteName, noteContents));

    asyncRmFile(location)
      .then(() => {
        ipcRenderer.send("delete-editor", { title: noteName });
        this.scanForNotes();
      })
      .catch(err => {
        console.warn(err);
      });
  };

  openNote = async noteName => {
    const noteFileName = `${noteName}.md`;
    const location = path.join(globalState.directoryPath, noteFileName);
    const noteContents = await asyncReadFile(location, "utf8");
    ipcRenderer.send("open-editor", {
      noteContents,
      noteFileName,
      noteTitle: noteName
    });
    this.hideWindow();
  };

  renameNote = (oldName, newName) => {
    const { directoryPath } = globalState;
    try {
      fs.accessSync(`${newName}.md`);
      console.error(`File ${newName} already Exists!`);
      return;
    } catch (err) {
      asyncRename(
        `${directoryPath}/${oldName}.md`,
        `${directoryPath}/${newName}.md`
      )
        .then(() => {
          undoStack.push(() => this.renameNote(newName, oldName));
          ipcRenderer.send("update-editor-title", {
            title: oldName,
            newTitle: newName,
            newFileName: `${newName}.md`
          });
          this.scanForNotes();
        })
        .catch(e => {
          console.warn(e);
        });
    }
  };

  hideWindow() {
    this.setState({ searchValue: "" });
    this.mainWindow.hide();
  }

  render() {
    const {
      currentSearchNotes,
      searchValue,
      indexOfNoteBeingRenamed
    } = this.state;

    const notes = orderBy(
      currentSearchNotes,
      ["indexOfValueInTitle", "indexOfValue", "lastModified"],
      ["asc", "asc", "desc"]
    );

    return (
      <div>
        <TopBarWrapper>
          <button
            onClick={e => {
              undoStack.undo();
              e.preventDefault();
            }}
          >
            UNDO
          </button>
          <Search
            autoFocus
            type="text"
            innerRef={this.input}
            value={searchValue}
            onChange={e => this.searchWrapper(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Escape") {
                e.preventDefault();
                this.hideWindow();
              }
              if (e.key === "Enter" && notes.length > 0) {
                this.openNote(notes[0].noteName);
              } else if (e.which === 13 && notes.length === 0) {
                this.createNewNote(searchValue, "").then(() =>
                  this.openNote(searchValue)
                );
              }
            }}
          />
          <AddNote
            onClick={() =>
              this.createNewNote(searchValue, "").then(() =>
                this.openNote(searchValue)
              )
            }
          >
            +
          </AddNote>
        </TopBarWrapper>
        <div>
          {notes.map((note, index) => (
            <File
              key={note.noteName}
              onClick={() => {
                if (index === indexOfNoteBeingRenamed) {
                  return;
                }
                this.openNote(note.noteName);
              }}
            >
              {index === indexOfNoteBeingRenamed ? (
                <input
                  ref={input => input && input.focus()}
                  type="text"
                  onFocus={e => e.target.select()}
                  defaultValue={note.noteName}
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      e.target.blur();
                      this.renameNote(note.noteName, e.target.value);
                    } else if (e.key === "Escape") {
                      e.target.blur();
                    }
                  }}
                  onBlur={() =>
                    this.setState({ indexOfNoteBeingRenamed: undefined })
                  }
                />
              ) : (
                note.noteName
              )}
              <span>
                {moment(note.lastModified).isAfter(moment().subtract(1, "days"))
                  ? moment(note.lastModified).fromNow()
                  : moment(note.lastModified).format("MMMM Do YYYY, h:mma")}
              </span>
              title: {note.indexOfValueInTitle}
              content: {note.indexOfValue}
              <button
                onClick={e => {
                  e.stopPropagation();
                  this.setState({ indexOfNoteBeingRenamed: index });
                }}
              >
                rename
              </button>
              <button
                onClick={e => {
                  e.stopPropagation();
                  this.deleteNote(note.noteName);
                }}
              >
                delete
              </button>
            </File>
          ))}
        </div>
      </div>
    );
  }
}

export default Main;
