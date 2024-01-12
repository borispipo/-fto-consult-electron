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
            packagePath = path.resolve(packagePath);
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
        get hasKey(){
            return (key)=>{
                if(typeof key !=='string' || !hasPackage) return false;
                const keys = key.split(".");
                let pJS = pJSON;
                if(keys.length === 1){
                    return (key in pJSON);
                }
                for(let i=0; i<keys.length-1;i++){
                    const k = typeof keys[i] =="string" && keys[i] || "";
                    if(!k) continue;
                    if(!isPlainObject(pJS)) return false;
                    pJS = pJS[k];
                }
                if(i === key.length-1 & i> 1){
                    if(!isPlainObject(pJS)) return false;
                    return (i in pJS);
                }
                return pJS !== undefined;
            }
        },
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
                    extendObj(true,pJSON,key);
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