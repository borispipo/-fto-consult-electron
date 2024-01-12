const path = require("path");
const deleteFileOrDirectory = require("./deleteFileOrDirectory");
const JSONFileManager = require("./JSONFileManager");
module.exports = {
    ...require("./object"),
    createDir : require("./createDir"),
    writeFile : require("./writeFile"),
    isWritable : require("./isWritable"),
    copy : require("./copy"),
    electronDir : path.resolve(__dirname, ".."),
    isRegExp : require("./isRegex"),
    paths : require("./paths"),
    exec : require("./exec"),
    uniqid : require("./uniqid"),
    debounce : require("./debounce"),
    postMessage : require("./postMessage"),
    deleteFile : deleteFileOrDirectory,
    deleteDirectory : deleteFileOrDirectory,
    deleteFileOrDirectory,
    throwError : (...args)=>{
        console.error(...args);
        process.exit(-1);
    },
    json : require("./json"),
    replaceAll : require("./replaceAll"),
    base64 : require("./base64"),
    dataURL : require("./dataURL"),
    isValidUrl : require("./isValidUrl"),
    createDirSync : require("./createDirSync"),
    ...require("./dependencies"),
    isObj : x=> typeof x =="object" && x && !Array.isArray(x),
    file : require("./file"),
    isNonNullString : require("./isNonNullString"),
    JSONManager : JSONFileManager,
    JSONFileManager,
    JSONConfig : JSONFileManager,
    isDateObj : require("./isDateObj"),
    string : require("./string"),
}