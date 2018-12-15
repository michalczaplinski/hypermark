import React, { Component } from "react";
import { debounce } from "lodash";
import { remote } from "electron"; //eslint-disable-line
import fs from "fs";

import "codemirror/lib/codemirror.css";
import "codemirror/addon/fold/foldgutter.css";

import "../hypermd/mode/hypermd.css";
import "../hypermd/theme/hypermd-light.css";

const hyperMD = require("ultramd");

export default class Editor extends Component {
  constructor(props) {
    super(props);

    const {
      noteContents,
      noteFileName
    } = remote.getCurrentWindow().editorProps;
    this.state = {
      noteContents,
      noteFileName
    };
  }

  componentDidMount() {
    const myTextarea = document.getElementById("textarea");
    const editor = hyperMD.fromTextArea(myTextarea, {
      hmdModeLoader: false,
      lineNumbers: false,
      gutters: [],
      foldGutters: false
    });
    editor.focus();

    editor.on("change", cm => {
      const newValue = cm.getDoc().getValue();
      this.update(newValue);
    });

    document.getElementsByClassName("CodeMirror").item(0).style = `font-size: ${
      this.props.fontSize
    }px`;

    this.editor = editor;
  }

  componentDidUpdate() {
    document.getElementsByClassName("CodeMirror").item(0).style = `font-size: ${
      this.props.fontSize
    }px`;
  }

  componentWillUnmount() {
    this.editor.off("change");
  }

  update = debounce(newValue => {
    this.saveNote(newValue);
  }, 300);

  saveNote = data => {
    const { noteFileName } = this.state;
    const location = `${this.props.directoryPath}/${noteFileName}`;
    fs.writeFile(location, data, err => {
      if (err) {
        throw err;
      }
    });
  };

  render() {
    const { noteContents } = this.state;
    return (
      <textarea value={noteContents} id="textarea" style={{ height: "100%" }} />
    );
  }
}
