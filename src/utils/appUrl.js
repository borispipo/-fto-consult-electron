const session = require("./session");
const isValidUrl = require("./isValidUrl");

const sessionKey= "main-app-url";
const getSessionKey = ()=>{
    return `${sessionKey}`;
}

module.exports = {
    get sessionKey(){
        return getSessionKey();
    },
    get url(){
        return session.get(getSessionKey())
    },
    set url(url){
        if(isValidUrl(url)){
            session.set(getSessionKey(),url);
        }
        return session.get(getSessionKey());
    }
}