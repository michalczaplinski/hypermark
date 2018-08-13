import React, { Component } from "react";
import styled from "styled-components";

import { focusStyles } from "../../style";

const StyledNote = styled.div`
  display: block;
  height: 70px;
  width: 100%;
  background-color: lightgreen;
  padding: 10px;
  margin-top: 3px;
  margin-bottom: 3px;
  font-size: 17px;
  text-align: center;
  border: none;
  transition: all 150ms ease;
  border-radius: 3px;

  &:hover {
    cursor: pointer;
  }

  &:first-of-type {
    ${({ focus }) => focus && focusStyles};
  }

  &:focus {
    ${focusStyles};
  }
`;

class Note extends Component {
  render() {
    const { children, ...props } = this.props;
    return <StyledNote {...props}>{children}</StyledNote>;
  }
}

export default Note;
