const http = require('http'),{URL} = require('url');
module.exports = function (url) {
    const err = {message:`Invalid url cannot exists`};
    if(!url || typeof url !=='string'){
        return Promise.reject(err);
    }
    try {
        const parsedUrl = new URL(url.replace("//localhost","//127.0.0.1"));
        const options = {
            method: 'HEAD',
            host: parsedUrl.host,
            port: parsedUrl.port || undefined,
            path: parsedUrl.pathname
        };
        console.log(options," is options heeeee");
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
    } catch(e) {
        console.log(e," parsing url to check")
        return Promise.reject(e);
    }
}