import os from "os";
import path from "path";

const directoryPath = path.join(os.homedir(), "Documents");
global.directoryPath = directoryPath;

export default global;
