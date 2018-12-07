import React, { Component } from "react";
import styled from "styled-components";
import { ipcRenderer,  remote } from "electron"; //eslint-disable-line
import { orderBy } from "lodash";
import Mousetrap from "mousetrap";
import "mousetrap-global-bind";
import path from "path";
import fs from "fs";

import { promisify } from "util";
import Note from "./Note";
import UndoButton from "./UndoButton";
import undoStack from "../undoStack";
import { focusStyles } from "../../style";

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
  z-index: 10;
  width: 100%;
  height: 70px;
  background-color: white;
`;

const TopBarWrapper = styled.div`
  position: relative;
  -webkit-user-select: none;
  display: flex;
  flex-flow: row nowrap;
`;

const BodyWrapper = styled.div`
  -webkit-user-select: none;
  margin-top: 65px;
  overflow: scroll;
`;

const Search = styled.input`
  -webkit-user-select: text;
  flex: 1;
  align-items: center;
  height: 60px;
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

  &::placeholder {
    color: #cccccc;
    -webkit-user-select: none;
  }
`;

const OpenPreferences = styled.div`
  pointer-events: visible;
  position: absolute;
  top: 0;
  right: 0;
  font-size: 16px;
  padding-left: 5px;
  height: 21px;
  width: 21px;

  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;

  &:hover {
    cursor: pointer;
    background: ${({ theme }) => theme.hoverColor};
  }
`;

const UndoContainer = styled.div`
  position: absolute;
  top: 5px;
  right: 5px;
`;

const AddNote = styled.button`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 50px;
  width: auto;
  border: none;
  border-radius: 5px;
  margin: 5px;
  padding: 5px;
  padding-left: 7px;
  padding-right: 7px;
  background-color: transparent;
  font-size: 25px;

  &:hover {
    cursor: pointer;
    color: ${({ theme }) => theme.buttonTextColor};
    background-color: ${({ theme }) => theme.hoverColor};
  }
  &:before {
    content: "⏎";
  }

  &:hover:before {
    font-size: 12px;
    content: "CREATE";
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
      undoVisible: false,
      currentFocusedNoteIndex: 0,
      currentSearchNotes: [],
      searchValue: ""
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
      this.input.focus();
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
      if (this.input) {
        this.input.focus();
      }
      this.scanForNotes();
    });

    // not sure if I need the "current"
    if (this.input.current) {
      this.input.current.focus();
    }
  }

  scanForNotes = async () => {
    const { searchValue } = this.state;
    try {
      const files = await asyncReaddir(this.props.directoryPath);
      const promiseOfFiles = files
        .filter(noteFileName => path.extname(noteFileName) === ".md")
        .map(noteFileName =>
          asyncStat(path.join(this.props.directoryPath, noteFileName))
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
        path.join(this.props.directoryPath, noteFileName),
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
      path.join(this.props.directoryPath, `${noteName}.md`),
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
    const location = path.join(this.props.directoryPath, noteFileName);
    const noteContents = await asyncReadFile(location, "utf8");

    undoStack.push(() => this.createNewNote(noteName, noteContents));

    asyncRmFile(location)
      .then(() => {
        ipcRenderer.send("delete-editor", { title: noteName });
        this.scanForNotes();
        this.setState({ undoVisible: true });
      })
      .then(() => {
        setTimeout(() => this.setState({ undoVisible: false }), 5000);
      })
      .catch(err => {
        console.warn(err);
      });
  };

  openNote = async noteName => {
    const noteFileName = `${noteName}.md`;
    const location = path.join(this.props.directoryPath, noteFileName);
    const noteContents = await asyncReadFile(location, "utf8");
    ipcRenderer.send("open-editor", {
      noteContents,
      noteFileName,
      noteTitle: noteName
    });
  };

  renameNote = (oldName, newName) => {
    const { directoryPath } = this.props;
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
        .then(() => {
          setTimeout(() => this.setState({ undoVisible: false }), 5000);
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
    const { openPreferences } = this.props;

    const {
      currentSearchNotes,
      searchValue,
      searchFocused,
      currentFocusedNoteIndex,
      undoVisible
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
            {undoVisible && (
              <UndoContainer>
                <UndoButton
                  onClick={e => {
                    undoStack.undo();
                    e.preventDefault();
                    this.setState({ undoVisible: false });
                  }}
                  hideUndo={() => {
                    this.setState({ undoVisible: false });
                  }}
                />
              </UndoContainer>
            )}

            {searchValue === "" && (
              <OpenPreferences onClick={openPreferences}>⚙️</OpenPreferences> //eslint-disable-line
            )}

            <Search
              placeholder="Type to search or create a new note..."
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
                />
              )}
          </TopBarWrapper>
        </TopAbsoluteWrapper>
        <BodyWrapper>
          {notes.map((note, index) => (
            <Note
              key={note.noteName}
              note={note}
              renameNote={this.renameNote}
              deleteNote={this.deleteNote}
              openNote={this.openNote}
              focus={searchFocused}
              focused={currentFocusedNoteIndex === index}
              innerRef={el => {
                if (index !== 0) {
                  this.noteRefs[index] = el;
                }
              }}
              onFocus={() => {
                this.setState({ currentFocusedNoteIndex: index });
              }}
              tabIndex={index === 0 ? null : "0"}
            />
          ))}
        </BodyWrapper>
      </div>
    );
  }
}

export default Main;
