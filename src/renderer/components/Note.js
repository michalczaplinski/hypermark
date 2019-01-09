import React, { Component } from "react";
import styled, { css, injectGlobal } from "styled-components";
import { focusStyles } from "../../style";
import Date from "./Date";

const StyledNote = styled.div`
  -webkit-user-select: none;
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
    background-color: ${({ theme }) => theme.hoverColor};
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
      color: ${({ theme }) => theme.deleteColor};
    }
  }
`;

const RenamingInput = styled.input`
  -webkit-user-select: text;
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

  pointer-events: auto;
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

  componentDidMount() {
    window.addEventListener("keyup", e => {
      if (e.key === "Escape") {
        this.setState({ isBeingRenamed: false });
        e.preventDefault();
        e.stopPropagation();
      }
    });
  }

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
      document.documentElement.style.setProperty("--pointer-events", "auto");
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
          if (e.key === "Backspace" && e.metaKey) {
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
