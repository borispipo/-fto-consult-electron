const postMessage = require("../../utils/postMessage");
const callbackRef = {current:null};
const instanceRef = {current:null};
const isValid = APP => false && APP && typeof APP =='object' && typeof APP.setTitle =='function';
const setInstance = (APP)=>{
    if(isValid(APP)){
        instanceRef.current = APP;
        if(typeof callbackRef.current =='function'){
            callbackRef.current(APP);
        }
    }
    callbackRef.current = undefined;
    return instanceRef.current;
}
module.exports = {
    get callback(){
        return callbackRef.current;
    },
    set callback(handler){
        callbackRef.current = handler;
    },
    get get (){
        return (handler,force)=>{
            if(typeof handler =="boolean"){
                const t = force;
                force = handler;
                handler = typeof force =="function"? force : undefined;
            }
            return new Promise((resolve,reject)=>{
                const timeoutRef = setTimeout(()=>{
                    reject({message : "not valid expo-ui electron app"});
                },500); //après une seconde si l'instance de l'application n'est pas récupérée alors on close l'application
                callbackRef.current = (APP)=>{
                    clearTimeout(timeoutRef);
                    callbackRef.current = undefined;
                    if(typeof handler =='function'){
                        handler(APP);
                    }
                    instanceRef.current = APP;
                    resolve(APP);
                };
                if(force !== true && isValid(instanceRef.current)){
                   return callbackRef.current(instanceRef.current);
                }
                postMessage("GET_APP_INSTANCE");
            });
        }
    },
    get set (){
        return setInstance;
    },
    set current (APP){
        return setInstance(APP);
    }
}