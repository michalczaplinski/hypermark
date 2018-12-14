import React, { Component } from "react";

export default class Dots extends Component {
  state = {
    counter: 0
  };

  componentDidMount() {
    this.intervalId = setInterval(() => {
      this.setState(prevState => ({
        counter: prevState.counter + 1
      }));
    }, 800);
  }

  componentWillUnmount() {
    clearInterval(this.intervalId);
  }

  render() {
    return <span> {"•".repeat((this.state.counter % 4) + 1)} </span>;
  }
}
