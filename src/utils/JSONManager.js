const fs = require("fs"),path = require("path");
const writeFile = require("./writeFile");
const {isPlainObject,extendObj} = require("./object");
/**** @see : https://www.npmjs.com/package/configstore?activeTab=readme*/

module.exports = function(packagePath,...rest){
    let hasPackage = true,pJSON = null,error=null;
    if(!packagePath || typeof packagePath !=="string" || !packagePath.toLowerCase().endsWith(".json")){
        hasPackage = false;
    }
    if(hasPackage){
        try {
            const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
            if(!isPlainObject(packageJson) || typeof packageJson?.name !=="string" || !packageJson?.name) {
                hasPackage = false;
            } else {
                pJSON = packageJson;
            }
        } catch(e){
            hasPackage = false;
            error = e;
        }
    }
    if(!isPlainObject(pJSON)){
        hasPackage = false;
    }
    const save = ()=>{
        if(!hasPackage) return false;
        try {
            writeFile(packagePath,JSON.stringify(pJSON,null,"\t"));
            return fs.existsSync(packagePath);
        }catch(e){
            return false;
        }
    };
    return {
        get hasPackage(){
            return hasPackage;
        },
        get exists(){
            return ()=>hasPackage;
        },
        get error(){return error},
        get set(){
            return (key,value)=>{
                if(!hasPackage) return undefined;
                if(typeof key ==='string' || !key) return pJSON; 
                return pJSON[key]||undefined;
            }
        },
        get filePath(){
            if(!hasPackage) return "";
            return packagePath;
        },
        get getFilePath(){
            return ()=>packagePath;
        },
        get set(){
            return (key,value)=>{
                if(!hasPackage) return false;
                if(typeof key =='string'){
                    pJSON[key] = value;
                } else if(isPlainObject(key)){
                    extendObj(pJSON,key);
                }
                return pJSON;
            }
        },
        get persist(){
            return save;
        },
        get save(){
            return save;
        }
    }
}