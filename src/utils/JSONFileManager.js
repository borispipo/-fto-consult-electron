const fs = require("fs"),path = require("path");
const writeFile = require("./writeFile");
const {isPlainObject,extendObj} = require("./object");
/**** @see : https://www.npmjs.com/package/configstore?activeTab=readme*/

module.exports = function(packagePath,...rest){
    let hasPackage = true,packageJSON = null,error=null;
    if(!packagePath || typeof packagePath !=="string" || !packagePath.toLowerCase().endsWith(".json")){
        hasPackage = false;
    }
    if(hasPackage){
        try {
            packagePath = path.resolve(packagePath);
            const pJSON = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
            if(isPlainObject(pJSON)){
                hasPackage = true;
                packageJSON = pJSON;
            }
        } catch(e){
            hasPackage = false;
            error = e;
        }
    }
    if(!isPlainObject(packageJSON)){
        hasPackage = false;
    }
    const save = ()=>{
        if(!hasPackage) return false;
        try {
            writeFile(packagePath,JSON.stringify(packageJSON,null,"\t"));
            return fs.existsSync(packagePath);
        }catch(e){
            return false;
        }
    };
    return {
        get hasPackage(){
            return hasPackage;
        },
        get packagePath(){
            return packagePath||null;
        },
        get exists(){
            return ()=>hasPackage;
        },
        get error(){return error},
        get hasKey(){
            return (key)=>{
                if(!hasPackage || typeof key !=='string' || !key) return false;
                key = key.trim();
                if(!key.includes(".")){
                    return !!(key in packageJSON);
                }
                const keys = key.split(".");
                const kk = keys.filter((_,i)=>i<keys.length-1).join(".");
                const end = keys[keys.length-1];
                const v = this.get(kk);
                if(!isPlainObject(v)) return false;
                return !!(end in v);
            }
        },
        get get(){
            return (key)=>{
                if(!hasPackage || typeof key !=='string' || !key) return packageJSON; 
                const keys = key.trim().split(".");
                if(keys.length === 1){
                    return packageJSON[key] || undefined;
                }
                let pJS = packageJSON;
                let i=0;
                for(i=0; i<keys.length-1;i++){
                    const k = keys[i] || "";
                    if(!k) continue;
                    if(!isPlainObject(pJS)) return undefined;
                    pJS = pJS[k];
                }
                if(i === keys.length-1){
                    if(!isPlainObject(pJS)) return undefined;
                    return pJS[keys[i]] || undefined;
                }
                return undefined;
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
            return (key,value,...rest)=>{
                if(!hasPackage) return false;
                if(typeof key =='string'){
                    packageJSON[key] = value;
                } else if(isPlainObject(key)){
                    extendObj(true,packageJSON,key,value,...rest);
                }
                return packageJSON;
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