
const {ipcRenderer } = require('electron');
const {uniqid,JSON : {isJSON,parseJSON}}= require("@fto-consult/node-utils");

let showPreloaderOnScreenCaptureRef = true;

function getUserMedia(constraints) {
    // if Promise-based API is available, use it
    if (typeof navigator !=="undefined" && navigator && navigator?.mediaDevices && typeof navigator?.mediaDevices?.getUserMedia =='function') {
        return navigator.mediaDevices.getUserMedia(constraints);
    }
    // otherwise try falling back to old, possibly prefixed API...
    const legacyApi = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
    if (legacyApi) {
      return new Promise(function (resolve, reject) {
        return legacyApi.bind(navigator)(constraints, resolve, reject);
      });
    }
    return Promise.reject({status:false,msg:"user media not available"})
}

async function getUserMediaAsync(constraints) {
    try {
      const stream = await getUserMedia(constraints);
      return stream;
    } catch (e) {
      console.error('navigator.getUserMedia error:', e);
    }
    return null;
}

const getConstraints = (options)=>{
    options = Object.assign({},options);
    return {
        audio: options.audio !== false ? {
            mandatory: {
              chromeMediaSource: 'desktop'
            }
        } : false,
       video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId : typeof options.source =='string' && options.source || undefined, 
        }
      }
    }
}
function formatDate(date) {
    const d = new Date(date),
        month = String(d.getMonth() + 1),
        day = String(d.getDate()),
        year = String(d.getFullYear());

    if (month.length < 2) 
        month = '0' + month;
    if (day.length < 2) 
        day = '0' + day;
    let hours = d.getHours(),minutes = d.getMinutes();
    if(hours < 10){
        hours = `0${hours}`;
    }
    return [day,month,year].join('-')+` ${hours}:${minutes}`;
}
module.exports = (ELECTRON)=>{
    let progressBarCounter = 0;
    let recorder = null, blobs= [];
    const getRecordingStatus = ()=>{
        const ret = {};
        ['isRecording','isPaused','isInactive'].map((v)=>{
            if(recorder){
                ret[v] = recorder.state == v.toLowerCase().split("is")[1]? true : false
            } else {
                ret[v] = false;
            }
        });
        return ret;
    };
    ipcRenderer.on("click-on-system-tray-menu-item",(event,opts)=>{
        opts = Object.assign({},opts);
        switch(opts.action){
            case "pauseRecording":
                return pauseRecording();
            case "stopRecording":
                return stopRecording();
            case "resumeRecording" : 
                return resumeRecording();
        }
    }),
    updateSystemTray = ()=>{
        const progressBar = ELECTRON.progressBar;
        const recordingStatus = getRecordingStatus();
        const {isPaused,isRecording} = recordingStatus;
        const canShowProgress = typeof showPreloaderOnScreenCaptureRef =="function"? showPreloaderOnScreenCaptureRef() : showPreloaderOnScreenCaptureRef;
        if(!canShowProgress){
            if(progressBarCounter !== 0){
                progressBarCounter = 0;
                progressBar.set(0);
            }
            return false;
        }
        if((isPaused || !isRecording)){
            progressBarCounter = 0;
        } else if(isRecording){
            progressBarCounter+=2;
        } else progressBarCounter = 0;
        progressBar.set(progressBarCounter);
    }
    const getSources = async function(options){
        return await ipcRenderer.invoke("get-desktop-capturer-sources",JSON.stringify(options)); 
    }
    const getSource = async function(options){
        const title = document.title;
        const SECRET_KEY = ELECTRON.appName || uniqid(`${''}app-desktop-capturer`);
        document.title = SECRET_KEY;
        ELECTRON.setTitle(SECRET_KEY,false)
        if(isJSON(options)){
            options = parseJSON(options);
        }
        options = Object.assign({},options);
        options.sourceName = typeof options.sourceName =="string" && options.sourceName || SECRET_KEY;
        let r = await ipcRenderer.invoke("get-desktop-capturer-source",JSON.stringify(options));
        if(isJSON(r)){
            r = parseJSON(r);
        }
        document.title = title;
        ELECTRON.setTitle(title);
        return Object.assign({},r);
    };
    
    function handleStream(stream,options) {
        const appName = ELECTRON.appName || uniqid(`${''}app-desktop-capturer`);
        let {mimeType,fileName} = options;
        recorder = new MediaRecorder(stream, { mimeType});
        blobs = [];
        recorder.ondataavailable = function(event) {
            if(event.data.size > 0){
                blobs.push(event.data);
            }
            updateSystemTray();
        };
        recorder.onstop = function(event){
            updateSystemTray();
            if(!blobs.length) return false;
            fileName = `${typeof fileName ==="string" && fileName || "video-"+appName}.webm`;
            return ELECTRON.FILE.write({content:new Blob(blobs, {type: mimeType}),mimeType,fileName}).catch((e)=>{
                console.log("writing media video recorded file ",e);
                throw e;
            }).finally(()=>{
                recorder = undefined;
                blobs = [];
            });
        }
        recorder.start(1000);
        updateSystemTray();
        return recorder;
    }
    
    async function startRecording(opts) {
        opts = Object.assign({},opts);
        if(!opts.source || typeof opts.source !='string'){
            throw {message : `Vous devez spécifier la source de l'écran dans les options de capture`,options:opts};
        }
        const {source} = opts;
        let hasFound = false;
        const sources = (await getSources()).map((s)=>{
            if(s.id === source){
                hasFound = true;
            }
            return s.id;
        });
        if(!hasFound){
            throw {message : `La source sélectionnées, d'id [${source}] de l'écran à capturer ne figure pas parmis les sources supportées : [${sources.join(",")}]`}
        }
        getRecordingStatusRef = opts.getRecordingStatus;
        showPreloaderOnScreenCaptureRef = !!opts.showPreloaderOnScreenCapture;
        const videoAndAudioStream = await getUserMediaAsync(getConstraints(opts));
        if(videoAndAudioStream){
            return handleStream(videoAndAudioStream,opts);
        }
        throw {message :`Flux de données vidée invalide`,options:opts}
    }
    function pauseRecording(){
        if(!recorder || !getRecordingStatus().isRecording) return;
        recorder.pause();
        updateSystemTray();
        return true;
    }
    function resumeRecording(){
        if(!recorder || !getRecordingStatus().isPaused) return;
        recorder.resume();
        updateSystemTray();
        return true;
    }
    function stopRecording(opts) {
        if(!recorder) return false;
        let s = getRecordingStatus();
        if(!s.isPaused && !s.isRecording){
            recorder = undefined;
            return false;
        }
        if(recorder){
            let s = getRecordingStatus();
            if(s.isRecording || s.isPaused){
                recorder.stop();
            }
        }
        recorder = undefined;
        return true;
    }
    const getScreenAccess = ()=>{
        return ipcRenderer.sendSync("get-desktop-capturer-screen-access");
    }
    ELECTRON.desktopCapturer = {
        updateSystemTray, 
        startRecording,
        getRecordingStatus,
        getSource,
        startRecording,
        pauseRecording,
        resumeRecording,
        stopRecording,
        getSources,
        getScreenAccess,
    };
    return ELECTRON.desktopCapturer;
}