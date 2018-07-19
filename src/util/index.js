import assert from "assert";
import Joi from "joi";

async function asyncFilter(arr, callback) {
  const fail = Symbol("");
  return (await Promise.all(
    arr.map(async item => ((await callback(item)) ? item : fail))
  )).filter(i => i !== fail);
}

function validateObject(value, schema) {
  const { error } = Joi.validate(
    value,
    Joi.object()
      .keys(schema)
      .required()
  );

  assert.equal(error, null);
}

export { asyncFilter, validateObject };
