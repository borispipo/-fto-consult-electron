#!/usr/bin/env node
const path= require("path");
const fs = require("fs");
const  {createDir,electronDir,copy,exec,throwError,writeFile,isValidUrl,JSONFileManager} = require("../src/utils");
const projectRoot = path.resolve(process.cwd());
const dir = path.resolve(__dirname);
const {supportedFrameworks,script,options} = require("./program");
  const isNeutralino = !!options.neutralino || process.env.isNeutralino || process.env.isNeutralinoScript;
  const isElectron = !isNeutralino;
  const frameworkName = isNeutralino ? "neutralino" : "electron";
    const electronProjectRoot = path.resolve(projectRoot,frameworkName);
    const opts = Object.assign({},typeof options.opts =='function'? options.opts() : options);
    let {out,arch,url,build,platform,import:packageImport,icon,framework} = opts;
    if(!framework || typeof framework !=='string' || !(framework in supportedFrameworks)){
        framework = "expo";
    }
    if(projectRoot == dir){
        throwError(`Invalid project root ${projectRoot}; project root must be different to ${dir}`);
    }
    const frameworkObj = supportedFrameworks[framework];
    const isAppInitialized = require("./is-initialized")(electronProjectRoot,isNeutralino);
    if(isNeutralino){
      process.env.isNeutralino = true;
      process.env.isNeutralinoScript = true;    
    } else {
      process.env.isElectron = true;
      process.env.isElectronScript = true;
    }
    const buildOutDir = path.resolve(electronProjectRoot,isNeutralino?"resources":"dist");
    const indexFile = path.resolve(buildOutDir,"index.html");
    const webBuildDir = path.resolve(projectRoot,frameworkObj.buildOutDir);
    const packagePath = path.resolve(projectRoot,"package.json");
    if(!fs.existsSync(packagePath)){
        throwError(`package.json file does not exist in ${projectRoot}. please make jure that your have running package script in ${framework} root application`);
    }
    const packageObj = require(`${packagePath}`);
    const homepage = packageObj.homepage;
    let cmd = undefined;
    icon = icon && typeof icon =="string" && fs.existsSync(path.resolve(icon)) && icon || undefined;
    if(isElectron){
      require("./create-index-file")({electronProjectRoot,appName:packageObj.name,icon});
    }
    const isInitScript = script =='init';
    let initPromise = undefined;
    if(!isAppInitialized || isInitScript){
        if(!isInitScript){
            console.log("initializing application ....");
        }
        if(isElectron){
          initPromise =  require("./init")({
             projectRoot,
             electronDir,
             electronProjectRoot,
             icon,
          });
          if(isInitScript) return initPromise;
        } else {
          initPromise = exec({cmd:`npx @fto-consult/neut create neutralino`});
        }
    }
    const outDir = out && path.dirname(out) && path.resolve(path.dirname(out),frameworkName) || path.resolve(electronProjectRoot,"bin")
    if(!createDir(outDir)){
        throwError("Impossible de créer le répertoire <<"+outDir+">> du fichier binaire!!");
    }
    const start = x=>{
       return new Promise((resolve,reject)=>{
          const cmdPrefix = isNeutralino ? `npx neu run` : `electron "${path.resolve(electronProjectRoot,"index.js")}"`
          return Promise.resolve(initPromise).finally(()=>{
            cmd = `${cmdPrefix}  ${icon ? `--icon ${path.resolve(icon)}`:""} ${isValidUrl(url)? ` --url ${url}`:''}`; //--root ${electronProjectRoot}
            exec({
              cmd, 
              projectRoot,
            });
          })
      });
    };
    if(isValidUrl(url)){
      return start();
    } else {
      const promise = new Promise((resolve,reject)=>{
        const next = ()=>{
          if(fs.existsSync(webBuildDir)){
                return copy(webBuildDir,buildOutDir).catch(reject).then(resolve);
            } else {
              reject("dossier web-build exporté par electron innexistant!!");
            }
        }
        if(!url && (build || script ==="build" || !fs.existsSync(path.resolve(webBuildDir,"index.html")))){
          console.log("exporting expo web app ...");
          try {
            writeFile(packagePath,JSON.stringify({...packageObj,homepage:"./"},null,"\t"));
          } catch{}
            cmd = frameworkObj.buildCmd;
            return exec({cmd,projectRoot}).then(next).catch(reject).finally(()=>{
              try {
                writeFile(packagePath,JSON.stringify({...packageObj,homepage},null,"\t"));
              } catch{}
            });
        } else {
          next();
        }
      });
      if(!fs.existsSync(buildOutDir) || !fs.existsSync(indexFile)){
        throwError("répertoire d'export web invalide où innexistant ["+buildOutDir+"]");
      }
      if(isNeutralino){
        const JM = JSONFileManager(path.resolve(electronProjectRoot,"neutralino.config.json"));
        const dName = path.basename(buildOutDir); 
      }
      Promise.all([Promise.resolve(initPromise),promise]).then(()=>{
        if(script === "start") return start();
        if(!isElectron && script !=="start"){
          process.exit();
          return null;
        }
        switch(script){
            case "package" :
              if(packageImport || opts.import){ //on importe le projet existant electron forge, @see : https://www.electronforge.io/import-existing-project
                console.log("importing electron forge existing project....");
                cmd = "npm install --save-dev @electron-forge/cli";
                return exec({cmd,projectRoot:electronProjectRoot}).finally(()=>{
                  cmd = `npm exec --package=@electron-forge/cli -c "electron-forge import"`;
                  return exec({cmd,projectRoot:electronProjectRoot}).then(()=>{
                    console.log("package electron forge importé avec succèss");
                  });
                });
              } else {
                cmd = `npx electron-forge package ${platform? `--platform="${platform}"`:""} ${arch?`--arch="${arch}"`:""}`;
                const electronPackagePath = path.resolve(electronProjectRoot,'package.json');
                const electronPackageJSON = require(electronPackagePath);
                const iconPath = icon ? path.resolve(icon) : null;
                const iconFolderOrPathName = iconPath ? path.parse(iconPath).base : null;
                const iconNpath = iconFolderOrPathName ? `./${iconFolderOrPathName}`:null;
                if(iconPath && iconNpath){
                  try {
                    copy(iconPath,path.resolve(electronProjectRoot,iconNpath))
                  } catch{}
                }
                try {
                  writeFile(electronPackagePath,JSON.stringify({...electronPackageJSON,icon:iconNpath||electronPackageJSON.icon,version:packageObj.version,name:packageObj.name||electronPackageJSON.realName||electronPackageJSON.name},null,"\t"));
                } catch{}
                  return exec({cmd,projectRoot:electronProjectRoot}).then(()=>{
                    console.log("application package avec succèss");
                  }).finally(()=>{
                      try {
                        writeFile(electronPackagePath,JSON.stringify({...electronPackageJSON,version:packageObj.version},null,"\t"));
                      } catch{}
                  });
            };
        }
      }).catch((e)=>{
        if(e && e?.toString()){
          console.log(e," electron application error");
        }
      }).finally(()=>{
        if(script !=="start"){
          process.exit();
        }
      });
    }
  