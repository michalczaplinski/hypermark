import React, { Component } from "react";
import ReactDOM from "react-dom";

import "codemirror/lib/codemirror.css";
import "codemirror/addon/fold/foldgutter.css";

import "./hypermd/mode/hypermd.css";
import "./hypermd/theme/hypermd-light.css";

export default class Editor extends Component {
  componentDidMount() {
    const HyperMD = require("ultramd");
    const myTextarea = document.getElementById("textarea");
    HyperMD.fromTextArea(myTextarea, {
      hmdModeLoader: false,
      lineNumbers: false,
      gutters: [],
      foldGutters: false
    });
  }

  render() {
    return <textarea id="textarea" />;
  }
}
