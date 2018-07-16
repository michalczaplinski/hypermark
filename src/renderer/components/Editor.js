import React, { Component } from "react";
import debounce from "lodash.debounce";
import { remote } from "electron";
import fs from "fs";

import "codemirror/lib/codemirror.css";
import "codemirror/addon/fold/foldgutter.css";

import "../hypermd/mode/hypermd.css";
import "../hypermd/theme/hypermd-light.css";

import globalState from "../../globals";

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

    editor.on("change", cm => {
      const newValue = cm.getDoc().getValue();
      this.update(newValue);
    });
  }

  update = debounce(newValue => {
    this.saveNote(newValue);
  }, 1000);

  saveNote = data => {
    const { noteFileName } = this.state;
    const location = `${globalState.directoryPath}/${noteFileName}`;
    fs.writeFile(location, data, err => {
      if (err) {
        throw err;
      }
    });
  };

  render() {
    const { noteContents } = this.state;
    return <textarea value={noteContents} id="textarea" />;
  }
}
