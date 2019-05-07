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
  hoverColor: "#f7f7f7",
  buttonTextColor: "#444444",
  focusColor: "#d7f0ff",
  deleteColor: "#D33F49"
};

const store = new Store();

class App extends React.Component {
  state = {
    directoryPath: store.get("directoryPath"),
    fontSize: store.get("fontSize"),
    shortcut: store.get("shortcut"),
    showPreferences: false
  };

  componentDidMount() {
    ipcRenderer.on("update-shortcut-success", (_, { shortcut }) => {
      this.setState({ shortcut });
    });
    ipcRenderer.on("update-shortcut-failure", () => {
      this.setState(prevState => {
        setTimeout(() => {
          this.setState({ shortcut: prevState.shortcut });
        }, 3000);
        return { shortcut: "Key combination not allowed!" };
      });
    });
  }

  componentWillUnmount() {
    ipcRenderer.removeAllListeners("update-shortcut-success");
    ipcRenderer.removeAllListeners("update-shortcut-failure");
  }

  updateDirectoryPath = directoryPath => {
    // TODO: there is a potential discrepancy between react component state and store state
    store.set("directoryPath", directoryPath);
    this.setState({ directoryPath });
  };

  updateShortcut = shortcut => {
    // TODO: This should probably be update to happen synchronously somehow
    ipcRenderer.send("update-shortcut", { shortcut });
  };

  updateFontSize = fontSize => {
    // TODO: there is a potential discrepancy between react component state and store state
    store.set("fontSize", fontSize);
    this.setState({ fontSize });
  };

  openPreferences = () => {
    this.setState({ showPreferences: true });
    ipcRenderer.send("preferences-open", true);
  };

  closePreferences = () => {
    this.setState({ showPreferences: false });
    ipcRenderer.send("preferences-closed", false);
  };

  render() {
    const { directoryPath, shortcut, fontSize, showPreferences } = this.state;

    if (showPreferences) {
      return (
        <ThemeProvider theme={theme}>
          <Preferences
            directoryPath={directoryPath}
            shortcut={shortcut}
            fontSize={fontSize}
            closePreferences={this.closePreferences}
            updateDirectoryPath={this.updateDirectoryPath}
            updateShortcut={this.updateShortcut}
            updateFontSize={this.updateFontSize}
          />
        </ThemeProvider>
      );
    }

    if (window.location.search.substring().slice(1) === "editor") {
      return <Editor directoryPath={directoryPath} fontSize={fontSize} />;
    }

    return (
      <ThemeProvider theme={theme}>
        <Main
          directoryPath={directoryPath}
          shortcut={shortcut}
          openPreferences={this.openPreferences}
        />
      </ThemeProvider>
    );
  }
}

ReactDOM.render(<App />, document.getElementById("app"));
