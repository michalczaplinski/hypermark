import React from "react";
import { remote, ipcRenderer } from "electron"; // eslint-disable-line

const Preferences = ({ directoryPath, closePreferences }) => (
  <div>
    <button onClick={closePreferences}> close </button>
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
            console.log(paths);
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
