import React from "react";
import styled from "styled-components";
import { remote, ipcRenderer } from "electron"; // eslint-disable-line

const Container = styled.div`
  -webkit-user-select: none;
  width: 100%;
  height: 100%;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 3px;
  right: 3px;

  display: block;
  border: 0;
  outline: none;

  pointer-events: visible;
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
  }
`;

const ContentContainer = styled.div`
  width: 90vw;
  padding-top: 12px;
  padding-left: 12px;
  display: flex;
  flex-flow: column nowrap;
  justify-content: flex-start;
  align-items: flex-start;
`;

const Heading = styled.h3`
  font-weight: bold;
  margin-top: 4px;
  margin-bottom: 4px;
`;

const Text = styled.p`
  font-size: 13px;
  margin-top: 4px;
  margin-bottom: 4px;
  color: #505050;
`;

const DirectoryPathContainer = styled.div`
  height: auto;
  width: 90%;
`;

const DirectoryPath = styled.div`
  font-size: 14px;
  background-color: ${({ theme }) => theme.hoverColor};
  color: #505050;
  padding: 7px;
  padding-left: 10px;
  word-wrap: break-word;
  border-radius: 5px;
  margin-top: 3px;
  margin-bottom: 6px;
`;

const Preferences = ({ directoryPath, closePreferences }) => (
  <Container>
    <CloseButton onClick={closePreferences}> Ｘ </CloseButton>
    <ContentContainer>
      <Heading> Notes location </Heading>
      <Text>
        FYI: If you change it, your notes won't be copied to the new location.
        You need to do it yourself!
      </Text>
      <DirectoryPathContainer>
        <DirectoryPath>{directoryPath} </DirectoryPath>
      </DirectoryPathContainer>
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
        Change...
      </button>
    </ContentContainer>
  </Container>
);

export default Preferences;
