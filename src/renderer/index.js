import React from "react";
import ReactDOM from "react-dom";
import { ThemeProvider } from "styled-components";
import Main from "./components/Main";
import Editor from "./components/Editor";

import "./../style/index.css";

const theme = {
  mainColor: "#ffffff",
  hoverColor: "#EFEFEF",
  buttonTextColor: "#444444",
  focusColor: "#d7f0ff",
  deleteColor: "#D33F49"
};

const App = () => {
  if (window.location.search.substring().slice(1) === "editor") {
    return <Editor />;
  }

  return (
    <ThemeProvider theme={theme}>
      <Main />
    </ThemeProvider>
  );
};

ReactDOM.render(<App />, document.getElementById("app"));
