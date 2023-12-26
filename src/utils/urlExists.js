const http = require('http'),{URL} = require('url');
module.exports = function (url) {
    const err = {message:`Invalid url cannot exists`};
    if(!url || typeof url !=='string'){
        return Promise.reject(err);
    }
    try {
        const parsedUrl = new URL(url);
        const options = {
            method: 'HEAD',
            host: parsedUrl.host,
            port: parsedUrl.port || undefined,
            path: parsedUrl.pathname
        };
        return new Promise((resolve,reject)=>{
            const req = http.request(options, function (r) {
                if([200,308].includes(r.statusCode) || /4\d\d/.test(`${r.statusCode}`) === false){
                    return resolve(url);
                }
                reject({message:`Url is not available, message : ${r?.statusMessage}, status code : ${r.statusCode}`});
            });
            req.on('error', reject);
            req.end();
        })
    } catch{
        return Promise.reject(err);
    }
}