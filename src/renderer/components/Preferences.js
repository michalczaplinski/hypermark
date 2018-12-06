import React from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import { remote, ipcRenderer } from "electron"; // eslint-disable-line

const Preferences = ({ directoryPath }) => (
  <div>
    <input disabled value={directoryPath} />
    <button
      onClick={() => {
        remote.dialog.showOpenDialog(
          {
            title: "Choose directory",
            defaultPath: directoryPath,
            properties: ["openDirectory"]
          },
          paths => {
            ipcRenderer.send("update-directory-path", {
              directoryPath: paths[0]
            });
          }
        );
      }}
    >
      choose path...
    </button>
  </div>
);

export default Preferences;
