const session = require("./session");
const isValidUrl = require("./isValidUrl");

const sessionKey= "main-app-url";
module.exports = {
    get sessionKey(){
        return sessionKey;
    },
    get url(){
        return session.get(sessionKey)
    },
    set url(url){
        if(isValidUrl(url)){
            session.set(sessionKey,url);
        }
        return session.get(sessionKey);
    }
}