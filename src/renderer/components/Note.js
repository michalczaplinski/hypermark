import React, { Component } from "react";
import styled from "styled-components";

import { focusStyles } from "../../style";

const StyledNote = styled.div`
  display: block;
  height: 70px;
  width: 100%;
  background-color: transparent;
  padding: 10px;
  font-size: 17px;
  transition: all 150ms ease;
  border-radius: 5px;

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
