module.exports = function isRegExp(regExp){
    if(regExp instanceof RegExp) return true;
    if(!regExp || typeof regExp !=="object" || (!Object.prototype.toString.call(regExp).includes("RegExp"))) return false;
    try {
        new RegExp(regExp);
        return true;
    } catch(e) {
        return false
    }
}