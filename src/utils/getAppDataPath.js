const {homedir} = require("os");
const path = require("path");
const fs = require("fs");
const isWritable = require("./isWritable");

module.exports = function getAppDataPath(appName) {
  const platform = process.platform;
  let p = undefined;
  appName = typeof appName =="string" && appName.trim().toUpperCase() || "";
  const appDataPath = isWritable(process.env.ProgramData) && process.env.ProgramData || isWritable(process.env.ALLUSERSPROFILE) && process.env.ALLUSERSPROFILE || process.env["APPDATA"]; 
  if (!appDataPath || !fs.existsSync(appDataPath)) {
    const homePath = homedir();
    const HOME = process.env.HOME;
    switch (platform()) {
      case "win32":
        p = path.join("AppData", "Roaming");
        if(fs.existsSync(path.join(homePath,p))){
            return appName ? path.join(homePath,p,appName) : path.join(homePath,p);
        }
        break;
      case "darwin":
        p = path.join("Library", "Application Support");
        if(fs.existsSync(path.join(homePath,p))){
            return appName ? path.join(homePath,p,appName) : path.join(homePath,p);
        }
        if(HOME && fs.existsSync(HOME)){
            p = path.join('Library','Preferences');
            if(fs.existsSync(path.join(HOME,p))){
                return appName ? path.join(HOME,p,appName) : path.join(HOME,p);
            }
        }
        break;
      case "linux":
        p = path.join(".config");
        if(fs.existsSync(path.join(homePath,p))){
            return appName ? path.join(homePath,p,appName) : path.join(homePath,p);
        }
        if(HOME && fs.existsSync(HOME)){
            p = path.join("local","share");
            if(fs.existsSync(path.join(HOME,p))){
                return appName ? path.join(HOME,p,appName) : path.join(HOME,p);
            }
        }
        break;
      default:
        appDataPath = getFallback();
    }
    return appName ? path.resolve(homePath,appName) : homePath;
  } else {
    return appName ? path.join(appDataPath,appName) : appName;
  }
}
