import React from "react";
import styled from "styled-components";
import moment from "moment";

const StyledDate = styled.div`
  font-size: 12px;
  font-weight: 600;
  font-style: italic;
`;

const DateContainer = styled.div`
  display: flex;
`;

const At = styled.div`
  font-weight: normal;
  color: #919191;
  font-size: 12px;
  margin-left: 3px;
  margin-right: 3px;
`;

const Date = ({ timestamp }) => {
  let date;
  if (moment(timestamp).isAfter(moment().subtract(1, "days"))) {
    date = <StyledDate>{moment(timestamp).fromNow()}</StyledDate>;
  } else {
    date = (
      <DateContainer>
        <StyledDate>{moment(timestamp).format("MMM Do YYYY")}</StyledDate>{" "}
        <At> at </At>{" "}
        <StyledDate>{moment(timestamp).format("h:mma")}</StyledDate>
      </DateContainer>
    );
  }
  return date;
};

export default Date;
