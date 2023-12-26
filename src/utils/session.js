const {app} = require('electron');
const Conf = require('./config');
const path = require("path");

/***** @see : https://www.npmjs.com/package/conf */
module.exports = function(options){
    options = Object.assign({},options);
    const appName = typeof options.appName =="string"? options.appName.toUpperCase().trim() : null;
    const p = app.getPath('userData');
    return new Conf({cwd:appName ? path.join(p,appName) : p,projectName:appName||undefined,...options});
};