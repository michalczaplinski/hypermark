const path = require("path");
const fs = require("fs");

const normalizedPath = path.join(__dirname, "node_modules/codemirror/mode");

fs.readdirSync(normalizedPath).forEach(file => {
  fs.appendFile(
    path.join(__dirname, "loader.js"),
    `require("codemirror/mode/${file}/${file}");\n`,
    err => console.log(err)
  );
});
