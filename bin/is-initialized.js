const fs = require("fs");
const path = require("path");
/*** check if electron is initialized at project root */
module.exports = (projectRoot,isNeutralino)=>{
    projectRoot = typeof projectRoot =='string' && projectRoot && fs.existsSync(projectRoot) && projectRoot || process.cwd();
    if(isNeutralino){
        if(fs.existsSync(path.resolve(projectRoot,"neutralino.config.json") && fs.existsSync(path.resolve(projectRoot,"bin")))){
            const dirs = ["neutralino-linux_arm64","neutralino-linux_armhf","neutralino-linux_x64","neutralino-mac_arm64","neutralino-mac_universal","neutralino-mac_x64","neutralino-win_x64.exe"];
            for(let i in dirs){
                const f = dirs[i];
                if(f && typeof f =="string" && fs.existsSync(path.resolve(projectRoot,"bin",f))) return true;
            }
            return false;
        }
        return false;
    }
    return fs.existsSync(path.resolve(projectRoot,"node_modules")) && fs.existsSync(path.resolve(projectRoot,"index.js")) 
        && fs.existsSync(path.resolve(projectRoot,"package.json")) 
        && fs.existsSync(path.resolve(projectRoot,'processes',"main","index.js")) 
        && fs.existsSync(path.resolve(projectRoot,'processes',"renderer","index.js"))     
    && true || false;
}