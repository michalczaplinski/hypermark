import { useState, useEffect } from "react";

export async function asyncFilter(arr, callback) {
  const fail = Symbol("");
  return (
    await Promise.all(
      arr.map(async (item) => ((await callback(item)) ? item : fail))
    )
  ).filter((i) => i !== fail);
}

export function makeArray(start, end) {
  return Array(end - start)
    .fill()
    .map((e, i) => i + start);
}

function getOnlineStatus() {
  return typeof navigator !== "undefined" &&
    typeof navigator.onLine === "boolean"
    ? navigator.onLine
    : true;
}

export function useOnlineStatus() {
  const [onlineStatus, setOnlineStatus] = useState(getOnlineStatus());

  const goOnline = () => setOnlineStatus(true);

  const goOffline = () => setOnlineStatus(false);

  useEffect(() => {
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return onlineStatus;
}
