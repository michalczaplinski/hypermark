import React from "react";

export default class KeyListener extends React.Component {
  state = {
    codes: new Set(),
  };

  componentDidMount() {
    window.addEventListener("keydown", this.onKeyDown);
  }

  componentWillUnmount() {
    window.removeEventListener("keydown", this.onKeyDown);
  }

  onKeyDown = ({ key }) => {
    this.setState(({ codes }) => {
      let hasOthers = false;
      codes.forEach((code) => {
        if (!this.isMeta(code)) {
          hasOthers = true;
        }
      });
      if (hasOthers && !this.isMeta(key)) {
        return;
      }
      if (codes.size === 4) {
        return { codes: new Set().add(key) };
      }
      return { codes: codes.add(key) };
    });
  };

  isMeta = (code) => ["Meta", "Alt", "Shift", "Control"].includes(code);

  clear = () => this.setState({ codes: new Set() });

  render() {
    const { codes } = this.state;
    const { children } = this.props;
    const codesArray = Array.from(codes);
    return children({ codes: codesArray, clear: this.clear });
  }
}
