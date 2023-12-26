const fs = require('fs');
const path = require("path");
module.exports = function(directoryOfPath){
    if(typeof directoryOfPath !=='string' || !directoryOfPath) return false;
    directoryOfPath = path.resolve(directoryOfPath.trim());
    if(!fs.existsSync(directoryOfPath)) return false;
    try {
        fs.accessSync(directoryOfPath,fs.constants.W_OK);
        return true;
    } catch{
    }
    return false;
}