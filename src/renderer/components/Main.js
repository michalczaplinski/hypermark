import React, { Component } from "react";
import styled from "styled-components";
import { ipcRenderer,  remote } from "electron"; //eslint-disable-line
import { orderBy } from "lodash";
import moment from "moment";
import Mousetrap from "mousetrap";
import "mousetrap-global-bind";
import path from "path";
import fs from "fs";

import { promisify } from "util";
import Note from "./Note";
import undoStack from "../undoStack";
import { focusStyles } from "../../style";
import globalState from "../../globals";

const asyncReadFile = promisify(fs.readFile);
const asyncReaddir = promisify(fs.readdir);
const asyncStat = promisify(fs.stat);
const asyncRmFile = promisify(fs.unlink);
const asyncWriteFile = promisify(fs.writeFile);
const asyncRename = promisify(fs.rename);

const TopAbsoluteWrapper = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  padding: 5px;
  padding-bottom: 10px;
  width: 100%;
  height: 80px;
  background-color: white;
`;

const TopBarWrapper = styled.div`
  display: flex;
  flex-flow: row nowrap;
`;

const BodyWrapper = styled.div`
  margin-top: 72px;
  overflow: scroll;
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
    ${focusStyles};
  }
`;

class Main extends Component {
  constructor(props) {
    super(props);
    this.state = {
      allNotes: [
        /* { noteName, lastModified } */
      ],
      searchFocused: true,
      currentFocusedNoteIndex: 0,
      currentSearchNotes: [],
      searchValue: "",
      indexOfNoteBeingRenamed: undefined
    };
    this.input = React.createRef();
    this.noteRefs = [];
    this.mainWindow = remote.getCurrentWindow();

    this.scanForNotes();
  }

  componentDidMount() {
    Mousetrap.bindGlobal("esc", () => {
      this.mainWindow.hide();
    });
    Mousetrap.bindGlobal(["command+z"], () => {
      undoStack.undo();
    });
    Mousetrap.bind("command+l", () => {
      this.input.current.focus();
    });

    Mousetrap.bindGlobal(["command+j", "down"], () => {
      const {
        currentFocusedNoteIndex: i,
        currentSearchNotes: notes
      } = this.state;

      const noteToFocus = this.noteRefs[Math.min(notes.length - 1, i + 1)];
      noteToFocus.focus();
    });

    Mousetrap.bindGlobal(["command+k", "up"], () => {
      const { currentFocusedNoteIndex: i } = this.state;

      const noteToFocus = this.noteRefs[Math.max(0, i - 1)];
      noteToFocus.focus();
    });

    ipcRenderer.on("focus", () => {
      if (this.input.current) {
        this.input.current.focus();
      }
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
    ipcRenderer.send("search-input-change", {
      searchListLength: currentSearchNotes.length
    });
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
    ipcRenderer.send("search-input-change", {
      searchListLength: 6
    });
  }

  render() {
    const {
      currentSearchNotes,
      searchValue,
      searchFocused,
      indexOfNoteBeingRenamed
    } = this.state;

    const notes = orderBy(
      currentSearchNotes,
      ["indexOfValueInTitle", "indexOfValue", "lastModified"],
      ["asc", "asc", "desc"]
    );

    return (
      <div style={{ overflow: "hidden" }}>
        <TopAbsoluteWrapper>
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
              placeholder="type to search or create a new note"
              autoFocus
              type="text"
              innerRef={el => {
                this.noteRefs[0] = el;
                this.input = el;
              }}
              value={searchValue}
              onBlur={() => this.setState({ searchFocused: false })}
              onFocus={() => {
                this.setState({
                  currentFocusedNoteIndex: 0,
                  searchFocused: true
                });
              }}
              onChange={e => this.searchWrapper(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Tab") {
                  this.setState({ currentFocusedNoteIndex: 1 });
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
            {searchValue !== "" &&
              !notes.map(({ noteName }) => noteName).includes(searchValue) && (
                <AddNote
                  onClick={() =>
                    this.createNewNote(searchValue, "").then(() =>
                      this.openNote(searchValue)
                    )
                  }
                >
                  +
                </AddNote>
              )}
          </TopBarWrapper>
        </TopAbsoluteWrapper>
        <BodyWrapper>
          {notes.map((note, index) => (
            <Note
              key={note.noteName}
              focus={searchFocused}
              innerRef={el => {
                if (index !== 0) {
                  this.noteRefs[index] = el;
                }
              }}
              onFocus={() => {
                this.setState({ currentFocusedNoteIndex: index });
              }}
              tabIndex={index === 0 ? null : "0"}
              onClick={() => {
                if (index === indexOfNoteBeingRenamed) {
                  return;
                }
                this.openNote(note.noteName);
              }}
              onKeyUp={e => {
                if (index === indexOfNoteBeingRenamed) {
                  return;
                }
                if (e.key === "Enter") {
                  this.openNote(note.noteName);
                }
                if (e.key === "Backspace") {
                  this.deleteNote(note.noteName);
                }
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
              <div>
                {moment(note.lastModified).isAfter(moment().subtract(1, "days"))
                  ? moment(note.lastModified).fromNow()
                  : moment(note.lastModified).format("MMMM Do YYYY, h:mma")}
              </div>
              <button
                tabIndex="-1"
                onClick={e => {
                  e.stopPropagation();
                  this.setState({ indexOfNoteBeingRenamed: index });
                }}
              >
                rename
              </button>
              <button
                tabIndex="-1"
                onClick={e => {
                  e.stopPropagation();
                  this.deleteNote(note.noteName);
                }}
              >
                delete
              </button>
            </Note>
          ))}
        </BodyWrapper>
      </div>
    );
  }
}

export default Main;
