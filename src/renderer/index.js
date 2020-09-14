import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { ipcRenderer } from "electron";
import { ThemeProvider } from "emotion-theming";
import Store from "electron-store";

import "./../style/index.css";

import Main from "./components/Main";
import Editor from "./components/Editor";
import Preferences from "./components/Preferences";

import "./loadModes";

const theme = {
  mainColor: "#ffffff",
  hoverColor: "#f7f7f7",
  buttonTextColor: "#444444",
  focusColor: "#d7f0ff",
  deleteColor: "#D33F49",
};

const store = new Store();

function App() {
  const [state, setState] = useState({
    directoryPath: store.get("directoryPath"),
    fontSize: store.get("fontSize"),
    shortcut: store.get("shortcut"),
    showPreferences: false,
  });

  useEffect(() => {
    ipcRenderer.on("update-shortcut-success", (_, { shortcut }) => {
      setState((state) => ({ ...state, shortcut }));
    });

    ipcRenderer.on("update-shortcut-failure", () => {
      setState((prevState) => {
        setTimeout(() => {
          setState({ ...prevState, shortcut: prevState.shortcut });
        }, 3000);
        return { ...prevState, shortcut: "Key combination not allowed!" };
      });
    });

    return () => {
      ipcRenderer.removeAllListeners("update-shortcut-success");
      ipcRenderer.removeAllListeners("update-shortcut-failure");
    };
  });

  const updateDirectoryPath = (directoryPath) => {
    // TODO: there is a potential discrepancy between react component state and store state
    store.set("directoryPath", directoryPath);
    setState((state) => ({ ...state, directoryPath }));
  };

  const updateShortcut = (shortcut) => {
    // TODO: This should probably be update to happen synchronously somehow
    ipcRenderer.send("update-shortcut", { shortcut });
  };

  const updateFontSize = (fontSize) => {
    // TODO: there is a potential discrepancy between react component state and store state
    store.set("fontSize", fontSize);
    setState((state) => ({ ...state, fontSize }));
  };

  const openPreferences = () => {
    setState((state) => ({ ...state, showPreferences: true }));
    ipcRenderer.send("preferences-open", true);
  };

  const closePreferences = () => {
    setState((state) => ({ ...state, showPreferences: false }));
    ipcRenderer.send("preferences-closed", false);
  };

  const { directoryPath, shortcut, fontSize, showPreferences } = state;

  if (showPreferences) {
    return (
      <ThemeProvider theme={theme}>
        <Preferences
          directoryPath={directoryPath}
          shortcut={shortcut}
          fontSize={fontSize}
          closePreferences={closePreferences}
          updateDirectoryPath={updateDirectoryPath}
          updateShortcut={updateShortcut}
          updateFontSize={updateFontSize}
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
        openPreferences={openPreferences}
      />
    </ThemeProvider>
  );
}

ReactDOM.render(<App />, document.getElementById("app"));
