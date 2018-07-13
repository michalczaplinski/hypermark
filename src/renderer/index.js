import React from "react";
import ReactDOM from "react-dom";
// import { BrowserRouter as Router, Route, Switch } from "react-router-dom";
import Main from "./Main";
import Editor from "./Editor";

const App = () => {
  if (window.location.search.substring().slice(1) === "editor") {
    return <Editor />;
  }
  return <Main />;
};

ReactDOM.render(<App />, document.body);
