import React, { useEffect, useState } from "react";
import useOnlineStatus from "@rehooks/online-status";
import { remote } from "electron"; //eslint-disable-line
import Store from "electron-store";
import styled from "styled-components";

import { queueForSaving } from "../../services/fileManager";

const HyperMD = require("hypermd");

const Overlay = styled.div`
  z-index: 10;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  display: flex;
  justify-content: center;
`;

const OverlayContent = styled.div`
  background: black;
  color: white;
  height: auto;
  padding: 8px;
  margin-top: 5px;
  border-radius: 3px;
`;

export default function Editor({ fontSize, directoryPath }) {
  const isOnline = useOnlineStatus();
  const { noteContents, noteFileName } = remote.getCurrentWindow().editorProps;

  const store = new Store();
  const [showOfflineWarning, setShowOfflineWarning] = useState(
    store.get("showOfflineWarning")
  );

  const saveNote = data => {
    const location = `${directoryPath}/${noteFileName}`;
    queueForSaving(location, data);
  };

  useEffect(() => {
    const myTextarea = document.getElementById("textarea");
    const editor = HyperMD.fromTextArea(myTextarea, {
      hmdModeLoader: "false",
      lineNumbers: false,
      gutters: [],
      foldGutters: false
    });
    editor.focus();

    editor.on("change", cm => {
      const newValue = cm.getDoc().getValue();
      saveNote(newValue);
    });

    document
      .getElementsByClassName("CodeMirror")
      .item(0).style = `font-size: ${fontSize}px`;

    return () => {
      if (editor) {
        editor.off("change");
      }
    };
  }, []);

  return (
    <>
      {showOfflineWarning &&
        !isOnline && (
          <Overlay>
            <OverlayContent>
              <div>you are offline</div>{" "}
              <button
                onClick={() => {
                  setShowOfflineWarning(false);
                }}
              >
                close
              </button>
              <div>
                Don't show the warning again
                <input
                  type="checkbox"
                  name="dont-show-warning"
                  onChange={e => {
                    console.log(e.target.checked);
                    store.set("showOfflineWarning", !e.target.checked);
                  }}
                />
              </div>
            </OverlayContent>
          </Overlay>
        )}

      <div style={{ paddingLeft: 17, paddingRight: 5 }}>
        <textarea
          value={noteContents}
          id="textarea"
          style={{ height: "100%", display: "none" }}
        />
      </div>
    </>
  );
}
