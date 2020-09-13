import React from "react";
import styled from "@emotion/styled";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

const StyledDate = styled.div`
  -webkit-user-select: none;
  font-size: 12px;
  font-weight: 600;
  font-style: italic;
`;

const DateContainer = styled.div`
  -webkit-user-select: none;
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
  if (dayjs(timestamp).isAfter(dayjs().subtract(1, "days"))) {
    date = <StyledDate>{dayjs(timestamp).fromNow()}</StyledDate>;
  } else {
    date = (
      <DateContainer>
        <StyledDate>{dayjs(timestamp).format("MMM D YYYY")}</StyledDate>{" "}
        <At> at </At>{" "}
        <StyledDate>{dayjs(timestamp).format("h:mma")}</StyledDate>
      </DateContainer>
    );
  }
  return date;
};

export default Date;
