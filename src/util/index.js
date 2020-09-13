async function asyncFilter(arr, callback) {
  const fail = Symbol("");
  return (await Promise.all(
    arr.map(async item => ((await callback(item)) ? item : fail))
  )).filter(i => i !== fail);
}

function makeArray(start, end) {
  return Array(end - start)
    .fill()
    .map((e, i) => i + start);
}

export { asyncFilter, makeArray };
