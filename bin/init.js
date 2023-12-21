const path= require("path");
const fs = require("fs");
const {exec,createDir,writeFile,copy} = require("../src/utils");
const electronDir = path.resolve(__dirname,"..","src");
const processesDir = path.resolve(electronDir,"processes");
const createIndexFile = require("./create-index-file");
const appSuffix = "-desk";
const mainPackage = require("../package.json");
const mainPackageName = mainPackage.name;

module.exports = ({projectRoot,electronProjectRoot,icon})=>{
    return new Promise((resolve,reject)=>{
        //make shure electron project root exists
        if(!createDir(electronProjectRoot)){
            throw "Unable to create electron project root directory at "+electronProjectRoot;
        }
        const mPackageJSON = Object.assign({},require(`${path.resolve(projectRoot,'package.json')}`));
        const electronPackagePath = path.resolve(electronProjectRoot,"package.json");
        const electronPackageJSON = Object.assign({},fs.existsSync(electronPackagePath)? require(electronPackagePath) : {});
        const projectRootPackage = {...mPackageJSON,...electronPackageJSON,icon:icon||electronPackageJSON.icon||undefined};
        const dependencies = {}
        const electronProjectRootPackage = path.resolve(electronProjectRoot,"package.json");
        projectRootPackage.main = `index.js`;
        projectRootPackage.dependencies = Object.assign({},electronPackageJSON.dependencies);
        projectRootPackage.dependencies[mainPackage.name] = mainPackage.version;
        projectRootPackage.devDependencies = Object.assign({},electronPackageJSON.devDependencies);
        projectRootPackage.scripts = {
            "build" : `npx ${mainPackageName} build`,
            "start" : `npx ${mainPackageName} start`,
            "run-dev" : `npx ${mainPackageName} start`,
            "compile2start" : `npx ${mainPackageName} start --build`,
            "start-electron" : `electron .`,
            "start-electron-web" : `electron . --url http://localhost:19006`,
            ...Object.assign({},electronPackageJSON.scripts)
        }
        projectRootPackage.name = projectRootPackage.name;
        projectRootPackage.realAppName = typeof projectRootPackage.realAppName =="string" && projectRootPackage.realAppName || projectRootPackage.name;
        if(!projectRootPackage.name.endsWith(appSuffix)){
            projectRootPackage.name +=appSuffix;
        }
        writeFile(electronProjectRootPackage,JSON.stringify(projectRootPackage,null,'\t'));
        if(!fs.existsSync(electronProjectRootPackage)){
            throw `unable to create ${electronProjectRootPackage} file`;
        }
        const mainFolder = path.resolve(electronProjectRoot,'processes',"main");
        const rendererFolder = path.resolve(electronProjectRoot,'processes',"renderer");
        if(!createDir(mainFolder)){
            throw `unable to create main process folder at ${mainFolder}`
        }
        if(!createDir(rendererFolder)){
            throw `unable to create renderer process folder at ${rendererFolder}`;
        }
        const mainFolderIndex = path.resolve(mainFolder,"index.js");
        const rendererFolderIndex = path.resolve(rendererFolder,"index.js");
        if(!fs.existsSync(mainFolderIndex)){
            copy(path.resolve(processesDir,"main.js"),mainFolderIndex);
        }
        if(!fs.existsSync(rendererFolderIndex)){
            copy(path.resolve(processesDir,"renderer.js"),rendererFolderIndex);
        }
        createIndexFile(electronProjectRoot);
        /**** copying all electron utils files */
        const utilsPath = path.resolve(electronProjectRoot,"utils");
        copy(path.resolve(electronDir,"utils"),utilsPath);
        const gP = path.resolve(electronProjectRoot,".gitignore") ;
        if(!fs.existsSync(gP)){
          try {
            writeFile(gP,require("./gitignore"));
          } catch{};
        }
        console.log("installing package dependencies ...");
        return exec({
            cmd : "npm install",// --prefix "+electronProjectRoot,
            projectRoot : electronProjectRoot,
        }).then((a)=>{
            return resolve(a);
        });
    })
}