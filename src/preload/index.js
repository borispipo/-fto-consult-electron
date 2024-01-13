
const {createDir,dataURL,FILE,base64:{isBase64},getAppDataPath,Session,uniqid,json:{isJSON,parseJSON},isNonNullString} = require("@fto-consult/node-utils");
const postMessage = require("../../utils/postMessage");
const { contextBridge, ipcRenderer, shell,Notification} = require('electron')
const appInstance = require("./app/instance");
const path = require("path");
const fs = require("fs");
const {getExtension,sanitizeFileName} = FILE;
const appName = ipcRenderer.sendSync("get-app-name");
const projectRoot = ipcRenderer.sendSync("get-project-root");
const sanitize = require("sanitize-filename");

if(!appName || typeof appName !=='string'){
    console.error("Nom de l'application invalide!! Veuillez spécifier un nom valide d'application ",projectRoot," is electron project root")
}
const APP_NAME = appName?.toUpperCase() || "";
const appUrl = require("../utils/appUrl")({appName});
let backupPathField = "_e_backupDataPath";
let cBackupPathField = "company"+backupPathField;
let dbPathField = "_electron_DBPathField";

const getPath = function(pathName){
    if(typeof pathName !=='string' || !pathName) return;
    return ipcRenderer.sendSync("get-path",pathName);
}
const APP_PATH = ipcRenderer.sendSync("get-APP_PATH");
let databasePath = path.join(APP_PATH,"databases");
let ROOT_APP_FOLDER = undefined;
let appBackupPathRef = undefined;
const defaultStr = (...args)=>{
    for(let i in args){
        if(args[i] && typeof args[i] ==='string') return args[i];
    }
    return "";
}
const separator = (path.sep)
if(typeof separator != 'string' || !separator){
    separator = (()=>{
        let filePath = databasePath;
        var sepIndex = filePath.lastIndexOf('/');
        if(sepIndex == -1){
            sepIndex = filePath.lastIndexOf('\\');
        }
        // include the trailing separator
        return filePath.substring(0, sepIndex+1);
    })();
}
const session = Session({appName});
const confPath = getAppDataPath(appName);
if(confPath && typeof confPath =="string"){
    if(createDir(confPath)){
        ROOT_APP_FOLDER = confPath;
        databasePath = path.join(confPath,"databases");
        createDir(databasePath);
    }
}

const getDatabasePath = ()=>{
    const p = session.get(dbPathField);
    if(fs.existsSync(p)){
        databasePath = p
    }
    if(!fs.existsSync(databasePath)){
        createDir(databasePath);
    }
    return databasePath;
}
const setDatabasePath =  (newPath)=>{
    session.set(dbPathField,newPath)
};
const setBackupPath = (newPath)=>{
    newPath = typeof newPath =='string' && newPath || typeof ROOT_APP_FOLDER =='string' && ROOT_APP_FOLDER || path.join(getPath("documents"),APP_NAME);
    appBackupPathRef = newPath;
    session.set(cBackupPathField,appBackupPathRef)
};

const validChannels = ["toMain", "myRenderChannel"];
const removeListener =  (channel, callback) => {
    if (isNonNullString(channel) /*&& validChannels.includes(channel)*/) {
        ipcRenderer.removeListener(channel, callback);
    }
}, removeAllListeners = (channel) => {
    if (isNonNullString(channel) /*&& validChannels.includes(channel)*/) {
        ipcRenderer.removeAllListeners(channel)
    }    
};

const createWindow = (options)=>{
    options = Object.assign({},options);
    options.showOnLoad = typeof options.showOnLoad =='boolean'? options.showOnLoad : true;
    return ipcRenderer.invoke("create-browser-windows",JSON.stringify(options));
};

const isWin = process.platform === "win32"? true : false;
const isLinux = process.platform === "linux"? true : false;
const isMac = process.platform =='darwin';
const os = require("os");
const { machineIdSync} = require('node-machine-id');
let totalRAM = os.totalmem();
if(typeof totalRAM !=="number"){
    totalRAM = 0;
}

const getMem = (unit,key)=>{
    let memory = 0;
    if(typeof os[key] =="function"){
        memory = os[key]();
    }
    if(typeof memory !=="number"){
        memory = 0;
    }
    if(!memory) return 0;
    if(typeof unit !=="string") unit = "gb";
    switch(unit.toLowerCase()){
        case "kb" : 
            return memory / 1024;
        case "mb" : 
            return memory / (1024 * 1024);
        case "gb" : 
            return memory / (1024 * 1024 * 1024);
    }
    return memory;
}

const createPDFFile = (options)=>{
    return new Promise((resolve,reject)=>{
        const dir = getPath("temp");
        options = Object.assign({},options);
        let {content,filename,fileName,charset,fileExtension,extension} = options;
        fileName = defaultStr(filename,fileName)
        if(dataURL.isDataURL(content)){
            content = dataURL.toBase64(content);
        }
        if(isBase64(content)){
            content = Buffer.from(content,'base64');
        } else {
           content = null;
        }
        if(!content){
          console.warn('type de contenu invalide!! impression création fichier electron');
          return null;
        }
        fileName = defaultStr(fileName,uniqid("generated-printed-pdf-file-name"))
        fileExtension = getExtension(fileName) || "pdf";
        if(fileExtension !=="pdf" || !fileExtension.endsWith("pdf")){
            fileExtension+="pdf";
        }
        charset = defaultStr(charset,'utf-8')
        fileName = sanitize(fileName);
        if(!fileName.endsWith(`.${fileExtension}`)){
            fileName += "."+fileExtension
        }
        return fs.writeFile(path.join(dir,fileName), content,{charset},(err)=>{
            if(!err) {
                const p = path.join(dir,fileName);
                const fileUrl = FILE.toUrl(p);
                const filePathUrl = FILE.toUrl(p);
                resolve({content,fileName,filename:fileName,path:p,filePathUrl,filePathUri:filePathUrl,fileUrl,filePath:p,fileUri:fileUrl})
            } else {
                reject(err);
            }
        })    
    })
}

const setProgressBar = (progress)=>{
    progress = Math.ceil(typeof progress !=='number'? 0 : progress);
    if(progress < 0) progress = 0;
    ipcRenderer.send("electron-window-set-progressbar",progress);
}

const ELECTRON = {
    get openPouchDBDatabase(){
        return require('./websql');
    },
    get appName(){
        return appName;
    },
    get progressBar (){
        return {
            get stop() {
                return x=>setProgressBar(0);
            },
            get set(){
                return setProgressBar;
            },
            get update(){
                return setProgressBar;
            },
        }
    },
    get getBackupPath(){
        return (p)=>{
            const eePath = session.get(cBackupPathField);
            const defPath  = ROOT_APP_FOLDER || path.join(getPath("documents"),APP_NAME);
            appBackupPathRef = typeof eePath =='string' && eePath || typeof defPath =='string' && defPath || '';
            if(!fs.existsSync(appBackupPathRef)){
                appBackupPathRef = defPath;
            }
            if(p && typeof (p) ==='string'){
                return path.join(appBackupPathRef,p);
            }
            return appBackupPathRef;
        };
    },
    get databasePath (){
        return getDatabasePath();
    },
    get getDatabasePath(){
        return getDatabasePath;
    },
    set databasePath(dPath){
        return setDatabasePath(dPath);
    },
    get setDatabasePath (){
        return setDatabasePath;
    },
    get setBackupPath (){
        return setBackupPath;
    } ,
    get CONFIG (){
        return session;
    },
    get showOpenDialog(){
       return (options)=>{
        options = typeof options =='object' && options && !Array.isArray(options)? options : {};
        return ipcRenderer.invoke("show-open-dialog",options);
       }
    },
    get showSaveDialog(){
        return (options)=>{
            options = typeof options =='object' && options && !Array.isArray(options)? options : {};
            return ipcRenderer.invoke("show-save-dialog",options);
        };
    },
    get restartApp(){
        return ()=>{
            ipcRenderer.sendSync("restart-app")
        };
    },
    get is() {
        return true;
    },
    get isWindow(){
        return isWin;
    },
    get isLinux(){
        return isLinux;
    },
    get isMac (){
        return isMac;
    },
    get isDarwin(){
        return isMac;
    },
    get APP_PATH(){
        return APP_PATH;
    },
    get initializeAPPInstance(){
        return ({APP,notify})=>{
            ELECTRON.notify = notify;
            ELECTRON.APP  = APP;
       }
    },
    get PATH (){
        return {
            SEPARATOR : separator,
            SEP : separator,
            get : getPath,
            HOME : getPath("home"),
            USERDATA : getPath("userData"),
            APPDATA : getPath("appData"),
            CACHE : getPath("cache"),
            TEMP : getPath("temp"),//Temporary directory.
            EXECUTABLE : getPath("exe"),//The current executable file.
            EXE : getPath("exe"),//The current executable file.
            DOCUMENTS : getPath("documents"),
            DOWNLOADS : path.join(APP_PATH,"downloads"),
            DESKTOP : getPath("desktop"),//The current user's Desktop directory.
        }
    },
    get FILE(){
        return FILE;
    },
    ///retourne le chemin dont la chaine de caractère est passé en paramètre
    get getPath(){
        return getPath;
    },
    get updateSystemTheme(){
        return  (theme)=>{
            return ipcRenderer.invoke("set-system-theme:toggle",theme);
        };
    },
    get SESSION (){
        return  {
            set : (key,value) =>{
                return session.set(key,value);
            },
            get : (key) =>{
                return session.get(key);
            }
        };
    },
    get on (){
        return (eventName, callback)=> {
            return ipcRenderer.on(eventName, callback)
        };
    },
    get  shellOpenExternal(){
        return async  (url)=> {
            await shell.openExternal(url)
        } 
    },
    get shellOpenPath(){
        return async (file)=> {
            await shell.openPath(file)
        };
    },
    get shellTrashItem(){
        return async (file)=> {
            await shell.trashItem(file)
        };
    },
    get trigger (){
        return (channel, ...data) => {
            if (isNonNullString(channel) /*&& validChannels.includes(channel)*/) {
                ipcRenderer.send(channel);
            }
        };
    },
    get on (){
        return (channel, callback) => {
            if (isNonNullString(channel) /*&& validChannels.includes(channel)*/) {
                // Filtering the event param from ipcRenderer
                const newCallback = (_, data) => callback(data);
                ipcRenderer.on(channel, newCallback);
            }
        };
    },
    get once (){
        return (channel, callback) => { 
            if (isNonNullString(channel) /*&& validChannels.includes(channel)*/) {
                const newCallback = (_, data) => callback(data);
                ipcRenderer.once(channel, newCallback);
            }
        };
    },
    get removeListener(){
        return removeListener;
    },
    get removeAllListeners(){
        return removeAllListeners;
    },
    get off (){
        return removeListener;
    },
    get offAll(){
        return removeAllListeners;
    },
    get version(){
        return process.versions.electron;
    },
    get isWindowsStore(){
        return process.windowsStore;
    },
    get versions(){
        return {
            node: () => process.versions.node,
            chrome: () => process.versions.chrome,
            electron: () => process.versions.electron,
        };
    },
    /****@see : https://www.electronjs.org/docs/latest/tutorial/ipc */
    get openFile(){
        return () => ipcRenderer.invoke('dialog:openFile');
    },
    get ping(){
        return () => ipcRenderer.invoke('ping');
    },
    get exitApp (){
        return x=>ipcRenderer.send("close-main-render-process");
    },
    get onGetAppInstance(){
        return (APP)=>{
            appInstance.set(APP);
        }
    },
    get toggleDevTools(){
        return async (toggle)=>{
            return await ipcRenderer.send("toggle-dev-tools",toggle);
        }
    },
    get gc (){
        return x =>{
            if(typeof global.gc =='function') return global.gc();
            return false;
        };
    },
    get DEVICE (){
        const device = {
            computerName : os.hostname(),
            operatingSystem : os.type(),
            isWindows : isWin,
            isLinux,
            isMac : process.platform =='darwin'? true : false,
            isDarwin : process.platform =='darwin'? true : false,
            arch : os.arch(),
            totalRAMInGB : totalRAM / (1024 * 1024 * 1024),
            getFreeRAM : (unit)=> getMem(unit,"freemem"),
            getTotalRAM : (unit)=> getMem(unit,'totalmem')
        }
        if(process.env && typeof process.env =="object"){
            const logName = process.env["LOGNAME"] || process.env["USER"];
            if(logName && typeof logName =="string"){
                device.computerUserName = logName;
            }
        }
        const uuid = machineIdSync({original: true});
        if(uuid && typeof uuid =='string') device.uuid = uuid;
        device.computerUserName = process.env.SUDO_USER || process.env.C9_USER || process.env.LOGNAME || process.env.USER ||process.env.LNAME || process.env.USERNAME || '';
        return device;
    },
    get getAutoUpdaterEvents (){
        return ()=> [
            //'checking-for-update',
            'update-available',
            'update-not-available',
            'error',
            'download-progress',
            'update-downloaded'
        ]
    },
    get createWindow (){
        return createWindow;
    },
    get createPDFWindow(){
        return (options)=>{
            options = Object.assign({},options);
            options.modal = true;
            return createWindow(options);
        }
    },
    get createPDFFile(){
        return createPDFFile;
    },
    get createPdfFile(){
        return createPDFFile;
    },
    createProgressBar : (options)=>{
        if(!options || typeof options != 'object' || Array.isArray(options)){
            options = {};
        }
        return //new ProgressBar(options,app);
    },
    get setTitle(){
        return (title,addSuffix) =>{
            if(title && typeof title =="string"){
                return ipcRenderer.sendSync("set-main-window-title",title,addSuffix);
            }
        };
    },
    get printPDF (){
        return (options)=>{
            options = Object.assign({},options);
            return createPDFFile(options).then(({path:mainPath,filePathUrl,fileName})=>{
                if(fs.existsSync(mainPath)){            
                    const opts = {
                        file : mainPath,
                        fileName,
                        pdfFilePath : mainPath,
                        showOnLoad : true,
                        isPDFWindow : true,//spécifie s'il s'agit de la fenêtre pdf
                        webPreferences: {
                            plugins: true
                        }
                    };
                    return this.createPDFWindow(opts)
                }
            })
        }
    },
    get toggleDarkMode(){
        return ()=>{
            return ipcRenderer.invoke('dark-mode:toggle');
        }
    },
    get setThemeToSystem (){
        return ()=>{
            return ipcRenderer.invoke('dark-mode:system');
        }
    },
    /***** fait passer le theme au mode dark */
    get setThemeToDark(){
        return ()=>{
            return ipcRenderer.invoke('set-system-theme:dark-mode');
        }
    },
    get setThemeToLight(){
        return ()=>{
            return ipcRenderer.invoke('set-system-theme:light-mode');
        }
    },
    get appPath(){
        return ipcRenderer.sendSync("get-app-path");
    },
    /**** permet de retourner l'url principale de l'application */
    get getAppUrl(){
        return ()=>appUrl.url;
    },
    get setAppUrl(){
        return (url)=>{
            appUrl.url = url;
            return appUrl.url;
        }
    },
    get getLoadedAppUrl(){
        return ()=>{
            return ipcRenderer.sendSync("get-loaded-app-url")
        };
    },
    get mainSession(){
        return {
            get get(){
                return (key)=>{
                    const v = ipcRenderer.sendSync("get-session",key);
                    if(isJSON(v)) return parseJSON(v);
                    return v;
                }
            },
            get set(){
                return (key,value)=>{
                    return ipcRenderer.sendSync("set-session",key,typeof value =='object'? JSON.stringify(value):value);
                }
            }
        }
    },
    get notify(){
        /***** permet d'envoyer les notifications avec l'api Notification d'electron*/
        return function(message,options){
            if(message && typeof message =='string'){
                message = {body:message};
            } else if(typeof message !=='object' || !message || Array.isArray(message)){
                message = {};
            }
            message = Object.assign({},message);
            options = Object.assign({},options);
            options = {...options,...message};
            options.body = options.body || options.message;
            options.title = options.title || "Notifications";
            return new Notification(options).show();
        }
    },
};

ELECTRON.getBackupPath();
//require("./app/index")(ELECTRON)
//require('v8-compile-cache');
//require("v8").setFlagsFromString('--expose_gc'); 

ipcRenderer.on('before-app-exit', () => {
    return postMessage("BEFORE_EXIT");
});

ipcRenderer.on("main-app-suspended",()=>{
    postMessage({
        message : "STOP_IDLE",
    });
})
ipcRenderer.on("main-app-restaured",()=>{
    postMessage({
        message : "TRACK_IDLE",
    });
});
ipcRenderer.on('console.log',(event,...message)=>{
    console.log(...message);
})
ipcRenderer.on('appReady',()=>{})
ipcRenderer.on("main-window-focus",()=>{
    postMessage("WINDOW_FOCUS");
})
ipcRenderer.on("main-window-blur",()=>{
    postMessage("WINDOW_BLUR");
});

process.once('loaded', () => {
    contextBridge.exposeInMainWorld('isElectron',true);
    contextBridge.exposeInMainWorld('ELECTRON',ELECTRON);
});

const mainRendererPath = path.join('processes',"renderer","index.js");
const rendererProcessIndex = projectRoot && fs.existsSync(path.resolve(projectRoot,mainRendererPath)) && path.resolve(projectRoot,mainRendererPath);
//pour étendre les fonctionnalités au niveau du renderer proceess, bien vouloir écrire dans le fichier projectRoot/electron/processes/renderer/index.js
// dans lequel exporter une fonction prenant en paramètre l'objet electron, que l'on peut étendre et le rendre accessible depuis l'application
const rendererProcess = rendererProcessIndex && require(`${rendererProcessIndex}`);    
(typeof rendererProcess ==='function') && rendererProcess(ELECTRON);


/**** affiche le repertoire de sélection d'un fichier 
*  options : {
*      mediaType || mimeType, le type de media à récupérer
*  }
*/
FILE.browse = FILE.showFileExplorer = (options)=>{
    /*** retourne plusieurs fichiers sélectionnés dans un tableau.
     *  la promesse généère un tableau contenant les différents fichiers sélectionnés
     */
 
    /**
    *
    * @returns Promise containing selected file's information,
    * MIME type, display name, and original URI.
    *  return : {
            mediaType: string;
            name: string;
            uri: string;
    * }
    */
    options = Object.assign({},options);
    const configKeyName = "lastOpenedFilePath";
    let defaultPath = isNonNullString(options.defaultPath) && fs.existsSync(options.defaultPath) && options.defaultPath || session.get(configKeyName);
    if(!isNonNullString(defaultPath) || !fs.existsSync(defaultPath)){
        defaultPath = undefined;
    }
    return new Promise((resolve,reject)=>{
        ELECTRON.showOpenDialog({
            ...options,
            properties: ['openFile','multiSelections'],
            defaultPath
        }).then((r)=>{
            if(r){
                if(r.canceled){
                    return r.canceled;
                }
                if(Array.isArray(r.filePaths)){
                    let files = [];
                    session.set(configKeyName,path.dirname(r.filePaths[0]))
                    for(let i in r.filePaths){
                        files.push({
                            path : r.filePaths[i],
                            name : path.basename(r.filePaths[i])
                        })
                    }
                    resolve(files);
                }
            }
        }).catch(reject);
    })
 }
 
 /**** sauvegarde un fichier sur le disque 
     *  Si directory est dir sont à undefined, àlors, l'explorateur d'enregistrement de fichier sera proposé à l'utilisateur de sélectionner l'emplacement à enregistrer
     *  le fichier sur le disque
     *  @param {object} {
     *      content {mix}: le contenu du fichier à enregistrer
     *      charset {string}: L'encodage à utiliser pour l'enregistrement du fichier, par défaut utf-8
     *      directory || dir {string} : le répertoire dans lequel enregistrer le fichier
     *      fileName {string} : le nom du fichier à enregistrer
     *  }
    */
FILE.write = ({content,isBinary,charset,isBase64:isB64,directory,dir,fileName})=>{
    directory = typeof directory =="string" && directory || typeof dir =="string" && dir || "";
    const configKeyName = "lastSavedDirectoryPath";
    let defaultPath = session.get(configKeyName);
    if(!isNonNullString(defaultPath) || !fs.existsSync(defaultPath)){
        defaultPath = undefined;
    }
    if(!directory){
        directory = defaultPath || getPath("documents");
        if(!defaultPath && appName){
            directory = path.resolve(directory,appName);
        }
    }
    return new Promise((resolve,reject)=>{
        if(!isNonNullString(fileName)){
           reject({status:false,message : 'Nom de fichier invalide',fileName});
            return;
        }
        fileName = sanitizeFileName(fileName);
        charset = typeof charset =="string" && charset || 'utf8';
        const writingOpts = {charset};
        if(dataURL.isDataURL(content)){
            content = dataURL.toBase64(content);
        }
        if(isBase64(content) || isB64){
            writingOpts.encoding = 'base64';
        } else {
            writingOpts.encoding = charset;
        }
        if(isBinary ===true || content instanceof Blob){
            delete writingOpts.encoding;
            writingOpts.encoding = "binary";
            return FILE.saveBinary({content,directory,fileName,charset,...writingOpts,}).then(resolve).catch(reject);
        }
        if(FILE.createDirectory(directory)){
            const ext = getExtension(fileName,true);
            const options = {
                //Placeholder 1
                title: "Sauvegarder "+fileName,
                
                //Placeholder 2
                defaultPath : path.resolve(directory,fileName),
                
                //Placeholder 4
                buttonLabel : "Enregistrer",
                
                //Placeholder 3
                filters : ext ? [{name: 'Fichier de Type .'+ext, extensions: [ext]}]: undefined
            }
            return ELECTRON.showSaveDialog(options).then((fName)=>{
                if(fName && fName?.canceled){
                    return reject({message : "Opération annulée",status:false});;
                }
                if(fName && typeof fName =="object" && isNonNullString(fName.filePath)){
                    fName = fName.filePath;
                }
                if(isNonNullString(fName) && !isBase64(fName)){
                    fs.writeFile(fName, content,writingOpts,(err) => {
                        if (err) {
                           return reject(err);
                        }
                        session.set(configKeyName,path.dirname(fName));
                        resolve({fName,path:fName,fileName:FILE.getFileName(fName,false),content});
                    });
                } else {
                  reject({message : "Opération annulée",status:false});
                }
            }).catch((e)=>{
                console.log(e,' is error writing electorn file')
                reject(e);
            });
        } else {
           reject({status : false,message : 'Impossible de créer le répertoire '+directory});
        }
    })
}
FILE.blobToBase64 = function(blob){
    if(!(blob instanceof Blob)) return Promise.reject({message:'Invalid blob'});
    if(typeof FileReader =='undefined') return Promise.reject({message : `File API is not defined on this platform`});
    // Define the FileReader which is able to read the contents of Blob
    const reader = new FileReader();
    return new Promise((resolve,reject)=>{
        // The magic always begins after the Blob is successfully loaded
        reader.onload = function () {
            // Since it contains the Data URI, we should remove the prefix and keep only Base64 string
            resolve(reader.result.replace(/^data:.+;base64,/, ''));
        };
        // Since everything is set up, let’s read the Blob and store the result as Data URI
        reader.readAsDataURL(blob);
        reader.onerror = reject;
    });
}
FILE.saveBinary = ({content,charset,data,mimeType,directory,mime,fileName})=>{
    mime = typeof mime =="string" && mine || typeof mimeType =="string" && mimeType ||"";
    return new Promise((resolve,reject)=>{
        data = typeof data !=="undefined" && data || content;
        charset =  (typeof charset==="string"? charset : 'utf8').trim();
        if(charset[0] === ";"){
            charset = charset.substr(1,charset.length-1);
        }
        fileName = sanitizeFileName(fileName);
        FILE.blobToBase64(data instanceof Blob ? data : new Blob(isArray(data)?data:[data], { type: mime + ";" +charset })).then((content)=>{
            return FILE.write({content,mimeType:mime,mime,charset,fileName,directory}).then(resolve).catch(reject)
        }).catch(reject);
    })
}
FILE.saveText = (options)=>{
    options = Object.assign({},options);
    options.mime = options.mimeType = typeof options.mime =="string" && options.mime || typeof mimeType =="string" && options.mimeType || "text/plain";
    return FILE.saveBinary(options);
}

require("./app/desktopCapturer")(ELECTRON);