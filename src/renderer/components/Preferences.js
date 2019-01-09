import React, { Fragment } from "react";
import styled from "styled-components";
import { remote } from "electron"; // eslint-disable-line

import { is } from "electron-util";

import { makeArray } from "../../util";
import KeyListener from "./KeyListener";

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
  padding-left: 12px;
  display: flex;
  flex-flow: column nowrap;
  justify-content: flex-start;
  align-items: flex-start;
`;

const Heading = styled.h3`
  font-weight: bold;
  margin-top: 17px;
  margin-bottom: 4px;
`;

const Text = styled.p`
  font-size: 13px;
  margin-top: 0;
  margin-bottom: 4px;
  color: #505050;
`;

const DirectoryPathContainer = styled.div`
  height: auto;
  width: 90%;
`;

const DisabledInput = styled.div`
  font-size: 14px;
  min-height: 31px;
  min-width: 43px;
  background-color: ${({ theme }) => theme.hoverColor};
  color: #505050;
  padding: 7px;
  padding-left: 10px;
  word-wrap: break-word;
  border-radius: 5px;
  margin-top: 3px;
  margin-bottom: 6px;
`;

function mapKeys(codes) {
  return codes
    .map(word => {
      if (word === "Meta") {
        if (is.macos) {
          return "⌘";
        }
        if (is.windows) {
          return "⊞Win";
        }
      }
      return word;
    })
    .join("+");
}

class Preferences extends React.Component {
  state = {
    recordingKeys: false
  };

  render() {
    const {
      closePreferences,
      directoryPath,
      fontSize,
      shortcut,
      updateShortcut,
      updateFontSize,
      updateDirectoryPath
    } = this.props;

    const { recordingKeys } = this.state;

    return (
      <Container>
        <CloseButton onClick={closePreferences}> Ｘ </CloseButton>
        <ContentContainer>
          <Heading> Notes location </Heading>
          <Text>
            FYI: If you change it, your notes won't be copied to the new
            location. You need to do it yourself!
          </Text>
          <DirectoryPathContainer>
            <DisabledInput>{directoryPath} </DisabledInput>
          </DirectoryPathContainer>
          <button
            onClick={() => {
              remote.dialog.showOpenDialog(
                {
                  title: "Choose directory",
                  defaultPath: directoryPath,
                  properties: ["openDirectory"]
                },
                path => updateDirectoryPath(path[0])
              );
            }}
          >
            Change...
          </button>
          <Heading>Font size</Heading>
          <select
            onChange={e => {
              updateFontSize(e.target.value);
            }}
            value={fontSize}
          >
            {makeArray(11, 22).map(value => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <Heading>Global shortcut </Heading>
          <Text>This shortcut will open the app from anywhere</Text>
          <KeyListener>
            {({ codes, clear }) => (
              <div>
                <DisabledInput>
                  {recordingKeys
                    ? mapKeys(codes)
                    : mapKeys(shortcut.split("+"))}
                </DisabledInput>
                {recordingKeys ? (
                  <Fragment>
                    <button
                      onClick={() => {
                        clear();
                      }}
                    >
                      Clear
                    </button>
                    <button
                      onClick={() => {
                        this.setState({ recordingKeys: false });
                        updateShortcut(codes.join("+"));
                      }}
                    >
                      Update
                    </button>
                  </Fragment>
                ) : (
                  <button
                    onClick={() => {
                      clear();
                      this.setState({ recordingKeys: true });
                    }}
                  >
                    Record...
                  </button>
                )}
              </div>
            )}
          </KeyListener>
        </ContentContainer>
      </Container>
    );
  }
}

export default Preferences;
