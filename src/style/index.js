import { css } from "styled-components";

export const focusStyles = css`
  cursor: pointer;
  background-color: ${({ theme }) => theme.focusColor};
  outline: none;
`;

export const noop = () => {};
