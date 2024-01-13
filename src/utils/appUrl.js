const appUrlSessionkey = "main-app-url-skey";
const {isValidUrl,Session} = require("@fto-consult/node-utils");
module.exports = function(options){
    const session = Session(options);
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