import fs from "fs";
import debounce from "lodash.debounce";

function _queueForSaving(location, data) {
  fs.writeFile(location, data, (err) => {
    if (err) {
      throw err;
    }
  });
}

export const queueForSaving = debounce(_queueForSaving, 2000, {
  leading: false,
  trailing: true,
});
