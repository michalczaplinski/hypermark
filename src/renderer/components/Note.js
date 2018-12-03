import React, { Component } from "react";
import styled, { css, injectGlobal } from "styled-components";
import { focusStyles } from "../../style";
import Date from "./Date";

const StyledNote = styled.div`
  position: relative;
  display: block;
  height: 60px;
  width: 100%;
  background-color: transparent;
  padding: 10px;
  transition: all 150ms ease;
  border-radius: 5px;

  &:hover {
    cursor: pointer;
    background-color: #f3f3f3;
  }

  &:first-of-type {
    ${({ focus }) => focus && focusStyles};
  }

  &:focus {
    ${focusStyles};
  }
`;

const Title = styled.div`
  font-size: 21px;
  width: 370px;
  height: 25px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;

  ${({ hovered }) =>
    hovered &&
    css`
      width: 275px;
    `};
`;

const DateContainer = styled.div`
  position: absolute;
  bottom: 6px;
  right: 7px;
  width: auto;
`;

const OptionsContainer = styled.div`
  position: absolute;
  background-color: transparent;
  top: 0;
  right: 0;
  display: flex;
`;

const Option = styled.div`
  font-size: 10px;
  font-weight: 400;
  padding: 3px;
  padding-top: 8px;
  padding-right: 7px;
  color: grey;
  text-transform: uppercase;
  text-align: center;
  width: 100%;
  height: 100%;
  &:hover {
    color: black;
  }

  &:last-of-type {
    border-top-right-radius: 5px;
    &:hover {
      color: red;
    }
  }
`;

const RenamingInput = styled.input`
  font-size: 21px;
  width: 370px;
  height: 25px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: grey;

  background-color: transparent;
  outline: none;
  border: 0;
  padding: 0;
  font-style: italic;

  &:focus {
    outline-offset: 0px;
  }
`;

injectGlobal`
  :not(${RenamingInput}) {
    pointer-events: var(--pointer-events);
  }
`;

class Note extends Component {
  state = {
    isHovered: false,
    isBeingRenamed: false
  };

  render() {
    const {
      note: { lastModified, noteName },
      renameNote,
      deleteNote,
      openNote,
      children,
      ...props
    } = this.props;
    const { isBeingRenamed, isHovered } = this.state;

    if (isBeingRenamed) {
      document.documentElement.style.setProperty("--pointer-events", "none");
    } else {
      document.documentElement.style.setProperty("--pointer-events", "inherit");
    }
    return (
      <StyledNote // eslint-disable-line
        onMouseOver={() => this.setState({ isHovered: true })}
        onMouseLeave={() => this.setState({ isHovered: false })}
        onClick={() => {
          if (isBeingRenamed) {
            return;
          }
          openNote(noteName);
        }}
        onKeyUp={e => {
          if (isBeingRenamed) {
            return;
          }
          if (e.key === "Enter") {
            openNote(noteName);
          }
          if (e.key === "Backspace") {
            deleteNote(noteName);
          }
        }}
        {...props}
      >
        {isBeingRenamed ? (
          <RenamingInput
            innerRef={input => input && input.focus()}
            type="text"
            onFocus={e => e.target.select()}
            defaultValue={noteName}
            onKeyDown={e => {
              if (e.key === "Enter") {
                e.target.blur();
                renameNote(noteName, e.target.value);
              } else if (e.key === "Escape") {
                e.target.blur();
              }
            }}
            onBlur={() => this.setState({ isBeingRenamed: false })}
          />
        ) : (
          <Title hovered={isHovered}>{noteName}</Title>
        )}
        {isHovered && (
          <OptionsContainer>
            <Option
              tabIndex="-1"
              onClick={e => {
                e.stopPropagation();
                this.setState({ isBeingRenamed: true });
              }}
            >
              rename
            </Option>
            <Option
              tabIndex="-1"
              onClick={e => {
                e.stopPropagation();
                deleteNote(noteName);
              }}
            >
              delete
            </Option>
          </OptionsContainer>
        )}
        <DateContainer>
          <Date timestamp={lastModified} />
        </DateContainer>
      </StyledNote>
    );
  }
}

export default Note;
