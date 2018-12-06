import React from "react";
import ReactDOM from "react-dom";
import { ipcRenderer } from "electron"; //eslint-disable-line
import { ThemeProvider } from "styled-components";
import Store from "electron-store";
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

const store = new Store();

class App extends React.Component {
  state = {
    directoryPath: store.get("path")
  };

  componentDidMount() {
    ipcRenderer.on("update-directory-path", ({ directoryPath }) => {
      this.setState({ directoryPath });
    });
  }

  render() {
    const { directoryPath } = this.state;

    if (window.location.search.substring().slice(1) === "editor") {
      return <Editor directoryPath={directoryPath} />;
    }

    return (
      <ThemeProvider theme={theme}>
        <Main directoryPath={directoryPath} />
      </ThemeProvider>
    );
  }
}

ReactDOM.render(<App />, document.getElementById("app"));
