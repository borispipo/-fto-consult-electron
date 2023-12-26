const Conf = require('./config');
const path = require("path");

/***** @see : https://www.npmjs.com/package/conf */
module.exports = function(options){
    options = Object.assign({},options);
    const appName = typeof options.appName =="string"? options.appName.toUpperCase().trim() : null;
    const cwd = require("./getAppDataPath")(appName);
    return new Conf({cwd,...options});
};