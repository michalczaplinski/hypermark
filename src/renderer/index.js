import React from "react";
import ReactDOM from "react-dom";
// import { BrowserRouter as Router, Route, Switch } from "react-router-dom";
import Main from "./components/Main";
import Editor from "./components/Editor";

import "./../style/index.css";

const App = () => {
  if (window.location.search.substring().slice(1) === "editor") {
    return <Editor />;
  }
  return <Main />;
};

ReactDOM.render(<App />, document.getElementById("app"));
