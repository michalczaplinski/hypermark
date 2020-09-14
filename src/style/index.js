import { css } from "@emotion/core";

export const focusStyles = ({ theme }) => css`
  cursor: pointer;
  background-color: ${theme.focusColor};
  outline: none;
`;
