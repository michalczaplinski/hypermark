import React from "react";
import ReactDOM from "react-dom";
import { ipcRenderer } from "electron"; //eslint-disable-line
import { ThemeProvider } from "styled-components";
import Store from "electron-store";

import Main from "./components/Main";
import Editor from "./components/Editor";
import Preferences from "./components/Preferences";

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
    directoryPath: store.get("path"),
    showPreferences: false
  };

  componentDidMount() {
    ipcRenderer.on("update-directory-path", (_, { directoryPath }) => {
      this.setState({ directoryPath });
    });
  }

  openPreferences = () => this.setState({ showPreferences: true });

  closePreferences = () => this.setState({ showPreferences: false });

  render() {
    const { directoryPath, showPreferences } = this.state;

    if (showPreferences) {
      return (
        <Preferences
          directoryPath={directoryPath}
          closePreferences={this.closePreferences}
        />
      );
    }

    if (window.location.search.substring().slice(1) === "editor") {
      return <Editor directoryPath={directoryPath} />;
    }

    return (
      <ThemeProvider theme={theme}>
        <Main
          directoryPath={directoryPath}
          openPreferences={this.openPreferences}
        />
      </ThemeProvider>
    );
  }
}

ReactDOM.render(<App />, document.getElementById("app"));
