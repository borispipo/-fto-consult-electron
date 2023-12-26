const appUrlSessionkey = "main-app-url-skey";
const isValidUrl = require("./isValidUrl");
module.exports = function(options){
    const session = require("./session")(options);
    return {
        get sessionKey(){
            return appUrlSessionkey;
        },
        get url(){
            return session.get(appUrlSessionkey)
        },
        set url(url){
            if(isValidUrl(url)){
                session.set(appUrlSessionkey,url);
            }
            return session.get(appUrlSessionkey);
        }
    }
}