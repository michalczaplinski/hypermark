import React from "react";
import styled from "@emotion/styled";

const UndoButtonStyled = styled.div`
  background-color: #4c4c4c;
  display: flex;
  align-items: center;
  border-radius: 3px;
  width: 75px;
  height: 30px;
  z-index: 20;

  &:hover {
    cursor: pointer;
  }
`;

const UndoAction = styled.div`
  padding: 7px;
  border-top-left-radius: 3px;
  border-bottom-left-radius: 3px;
  font-size: 13px;
  background-color: #4c4c4c;
  text-align: center;
  color: white;

  &:hover {
    background-color: #5f5f5f;
    cursor: pointer;
  }
`;

const DismissButton = () => (
  <svg
    width="11px"
    height="11px"
    viewBox="0 0 230 230"
    version="1.1"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g id="Page-1" stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
      <path
        d="M5,5 L221,225"
        id="Line"
        stroke="#ffffff"
        strokeWidth="12"
        fill="#ffffff"
        fillRule="nonzero"
      />
      <path
        d="M5,225 L225,5"
        id="Line-2"
        stroke="#ffffff"
        strokeWidth="12"
        fill="#ffffff"
        fillRule="nonzero"
      />
    </g>
  </svg>
);

const DismissButtonContainer = styled.div`
  border-top-right-radius: 3px;
  border-bottom-right-radius: 3px;
  height: 100%;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-right: 3px;

  &:hover {
    background-color: #5f5f5f;
    cursor: pointer;
  }
`;

const UndoButton = ({ onClick, hideUndo }) => (
  <UndoButtonStyled>
    <UndoAction onClick={onClick}> UNDO </UndoAction>
    <DismissButtonContainer onClick={hideUndo}>
      <DismissButton />
    </DismissButtonContainer>
  </UndoButtonStyled>
);

export default UndoButton;
