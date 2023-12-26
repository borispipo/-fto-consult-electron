const {app} = require('electron');
const Conf = require('./config');

/***** @see : https://www.npmjs.com/package/conf */
module.exports = function(options){
    options = Object.assign({},options);
    return new Conf({cwd:app.getPath('userData'),...options});
};