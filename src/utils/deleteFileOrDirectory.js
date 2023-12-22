const fs = require("fs");
const path = require("path");

const deleteFileOrDirectory = function (fileOrDirectoryPath) {
    if(typeof fileOrDirectoryPath !=="string" || !fileOrDirectoryPath ) return true;
    if (fs.existsSync(fileOrDirectoryPath)) {
        const stat = fs.lstatSync(fileOrDirectoryPath);
        if(stat.isDirectory()){
            fs.readdirSync(fileOrDirectoryPath).forEach((file, index) => {
                const curPath = path.join(fileOrDirectoryPath, file);
                if (fs.lstatSync(curPath).isDirectory()) {
                 // recurse
                  deleteFileOrDirectory(curPath);
                } else {
                  // delete file
                  fs.unlinkSync(curPath);
                }
            });
            fs.rmdirSync(fileOrDirectoryPath);
        } else if(stat.isFile()){
            fs.unlinkSync(fileOrDirectoryPath);
        }
    }
    return true;
};

module.exports = deleteFileOrDirectory;