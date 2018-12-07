import React from "react";
import styled from "styled-components";
import { remote, ipcRenderer } from "electron"; // eslint-disable-line

const Container = styled.div`
  -webkit-user-select: none;
  position: relative;
  width: 100%;
  height: 100%;
`;

const CloseButton = styled.button`
  display: block;
  border: 0;
  outline: none;

  pointer-events: visible;
  position: absolute;
  top: 0;
  right: 0;
  font-size: 15px;
  padding-left: 7px;
  height: 26px;
  width: 26px;

  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;

  &:hover {
    cursor: pointer;
    background-color: ${({ theme }) => theme.hoverColor};
  }
`;

const Preferences = ({ directoryPath, closePreferences }) => (
  <Container>
    <CloseButton onClick={closePreferences}> Ｘ </CloseButton>
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
  </Container>
);

export default Preferences;
