const fs = require("fs");
const {writeFile} = require("@fto-consult/node-utils");
const path = require("path");
const packageJSON = require("../package.json");

module.exports = ({electronProjectRoot,force,logo,appName})=>{
    if(!electronProjectRoot || typeof electronProjectRoot !='string' || !fs.existsSync(electronProjectRoot)){
        return null;
    }
    const indexPath = path.resolve(electronProjectRoot,"index.js");
    if(!fs.existsSync(indexPath) || force === true){
        writeFile(indexPath,`require("${packageJSON.name}");`);
    }
    return indexPath;
}