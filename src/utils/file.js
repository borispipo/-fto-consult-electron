const createDir = require("./createDir");
const isWritable = require("./isWritable");
const writeFile = require("./writeFile");
const copy = require("./copy");
const fs = require("fs");
const path = require("path");
const sanitize = require("sanitize-filename");
const isNonNullString = require("./isNonNullString");
const directoryExists = (dirPath)=>{
    return isDirectory(dirPath);
}

const isFileOrDirectory = (path,type)=>{
    if(!isNonNullString(path) || !fs.existsSync(path)) return false;
    const stat = fs.lstatSync(path);
    if(!type || typeof type !=="string"){
        return stat && (stat.isDirectory() || stat?.isFile());
    }
    switch(type.trim().toLowerCase()){
        case 'directory':
            return stat && stat.isDirectory();
        default : 
            return stat && stat.isFile();
    }
}
const isDirectory = (dirPath)=>{
    return isFileOrDirectory(dirPath,'directory');
}
const isFile = (filePath)=>{
    return isFileOrDirectory(filePath);
}

/****
    retourne le nom du fichier dont le chemin est passé en paramètre
    @param {string} file, le chemin du fichier
    @param {boolean} withoutExtension, si c'est sans extension
    @return {boolean}
*/
const getName = (file,withoutExtension)=>{
    withoutExtension = typeof withoutExtension =='boolean'? withoutExtension : true;
    if(!file || typeof file !=="string") return "";
    return withoutExtension? path.basename(file,path.extname(file)): path.basename(file);
}

/*** 
    @param string filePath: le chemin du fichier
 *   @param bool resolve, si la fonctioin path.resolve :Resolves all the path segments into an absolute path.
 */
const fileUrl = (filePath, resolve) => {
    if(!isNonNullString(filePath)){
        return "";
    }
	resolve = typeof resolve !== undefined ? resolve : false;
	let pathName = (resolve ? path.resolve(filePath) : filePath).trim().replace(/\\/g, '/').trim();
	// Windows drive letter must be prefixed with a slash
	if (pathName[0] !== '/' && resolve) {
		pathName = `/${pathName}`;
	}
	pathName = `file://${pathName}`;
	if(typeof encodeURI ==="function" && typeof encodeURI !=='undefined' && typeof encodeURIComponent !== 'undefined'){
	    
    	// Escape required characters for path components
    	// See: https://tools.ietf.org/html/rfc3986#section-3.3
    	return encodeURI(pathName).replace(/[?#]/g, encodeURIComponent)
	}
	return pathName;
};

const getExtension = (file)=>{
    if(!file || typeof file !=="string") return "";
    return path.extname(file);
};

/**** prend en paramètre le chemin complet d'un fichier, et lit le contenu sur forme de contenu texte brute
 *  @param filePath : le chemin absolu du fichier à lire le contenu
    @param readType : le type de contenu à lire : text : le fichier sera lu en contenu texttuel
    @return Promise<>
 */
const read = (filePath,readType)=>{
    if(!isNonNullString(readType)) readType = "text";
    if(!isNonNullString(filePath) || !fs.existsSync(filePath)) {
        return Promise.reject(({msg : 'Fichier innexistant ou chemin du fichier invalide ou commande non compatible pour la lecture du fichier'}));
    }
    try {
        return new Promise((resolve,reject)=>{
            fs.readFile(filePath, function (err, data) {
                if (err) {
                    return reject(err);
                }
                switch ((readType.toLowerCase())) {
                    case 'text':
                        data = data.toString();
                        break;
                    default:
                        break;
                }
                resolve(data);
            });
        })
    }  catch(e){
        return Promise.reject(e);
    }              
}
const sanitizeFileName = (fileName)=>{
    if(typeof fileName !=="string") return "";
    return sanitize(fileName);
}
const modExport = {
    toUrl : fileUrl,
    createDir,
    createDirectory : createDir,
    writeFile,
    isWritable,
    isDirectory,
    isFile,
    isFileOrDirectory,
    directoryExists,
    fileExists : isFile,
    getExtension,
    copy,
    getName,
    getFileName : getName,
    exists : function(path,...rest){
        if(typeof path !=='string' || !path) return false;
        return fs.existsSync(path,...rest);
    },
    sanitize : sanitizeFileName,
    sanitizeFileName,
    read,
    readAsText : (filePath)=>{
        return read(filePath,'text');
    },
    /*** retourne les statistiques sur le fichier passé en paramètre */
    getStats : (file) =>{
        if(!isNonNullString(file) || !fs.existsSync(file)) return null;
        const stats = fs.statSync(file)
        stats.sizeInBytes = stats.size;
        stats.sizeInKiloBytes = stats.size / 1024;
        stats.sizeInMegaBytes = stats.sizeInKiloBytes / 1024;
        return stats;
    }
}

module.exports = modExport;