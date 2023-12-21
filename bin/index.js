#!/usr/bin/env node
const path= require("path");
const fs = require("fs");
const  {createDir,electronDir,copy,exec,throwError,writeFile,isValidUrl} = require("../src/utils");
const { program } = require('commander');
const projectRoot = path.resolve(process.cwd());
const dir = path.resolve(__dirname);

const supportedFrameworks = {
    expo : {
        buildCmd : "npx expo export:web",
        buildOutDir : "web-build",
    },
}

program.description('utilitaire cli pour la plateforme electron. NB : Le package electron doit être installé globalement via l\'instruction : npm i -g electron')
  .argument('<cmd>', 'la commande à exécuter (start,init,build,package). Start permet de démarrer le script electron, init permet d\'initialiser l\'application, build permet de compiler le code expo (exporter), package permet d\'effectuer le packaging de l\'application pour la distribution')
  //.option('-r, --project-root [dir]', 'le project root de l\'application')
  //.option('-c, --config [dir]', 'le chemin (relatif au project root) du fichier de configuration de l\'application electron')
  //.option('-s, --splash [dir]', 'le chemin (relatif au project root) du fichier du splash screen de l\'application')
  .option('-o, --out [dir]', 'le chemin du répertoire qui contiendra les fichiers générés à l\'aide de la commande make : ; commande : make')
  .option('-u, --url [url]', 'le lien url qui sera ouvert par l\'application; commande start')
  .option('-b, --build [boolean]', 'si ce flag est spécfifié alors l\'application sera compilée; combinée avec la commande start|package pour indiquer que l\'application sera à nouveau exportée ou pas.')
  .option('-a, --arch [architecture]', 'l\'architecture de la plateforme; Commande package')
  .option('-p, --platform [platform]', 'la plateforme à utiliser pour la compilation; commande package')
  .option('-l, --icon [iconPath]', 'le chemin vers le dossier des icones de l\'application : (Dans ce dossier, doit contenir une image icon.ico pour window, icon.incs pour mac et icon.png pour linux)')
  .option('-i, --import [boolean]', 'la commande d\'initialisation du package electron forge, utile pour le packaging de l\'application. Elle permet d\'exécuter le cli electron package, pour l\'import d\'un projet existant. Commande package. exemple : expo-ui electron package --import')
  .option('-f, --framework [frameworkName]', `Le nom du framework utilisé pour générer l\'application electron. Les frameworks supportés sont pour l\'instant : [${Object.keys(supportedFrameworks)}]. Le framework [expo] est le framework par défaut`)

  program.parse();
  
  const script = program.args[0];
  const options = program.opts();
    const electronProjectRoot = path.resolve(projectRoot,"electron");
    const opts = Object.assign({},typeof options.opts =='function'? options.opts() : options);
    let {out,arch,url,build,platform,import:packageImport,icon,framework} = opts;
    if(!framework || typeof framework !=='string' || !(framework in supportedFrameworks)){
        framework = "expo";
    }
    if(projectRoot == dir){
        throwError(`Invalid project root ${projectRoot}; project root must be different to ${dir}`);
    }
    const frameworkObj = supportedFrameworks[framework];
    const isElectionInitialized = require("./is-initialized")(electronProjectRoot);
    process.env.isElectron = true;
    process.env.isElectronScript = true;
    const buildOutDir = path.resolve(electronProjectRoot,"dist");
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
    require("./create-index-file")({electronProjectRoot,appName:packageObj.name,icon});
    if(fs.existsSync(electronProjectRoot)){
      const mainPackagePath = path.resolve(electronProjectRoot,"package.app.json");
      try {
        const mainPackageAppJSON = fs.existsSync(mainPackagePath)? require(mainPackagePath) : {};
        writeFile(mainPackagePath,JSON.stringify({...packageObj,...mainPackageAppJSON,name:packageObj.name,icon:icon||mainPackageAppJSON.icon||undefined},null,"\t"));
      } catch{}
    }
    const isInitScript = script =='init';
    let initPromise = undefined;
    if(!isElectionInitialized || isInitScript){
        if(!isInitScript){
            console.log("initializing application ....");
        }
        initPromise =  require("./init")({
           projectRoot,
           electronDir,
           electronProjectRoot,
           icon,
        });
        if(isInitScript) return initPromise;
    }
    const outDir = out && path.dirname(out) && path.resolve(path.dirname(out),"electron") || path.resolve(electronProjectRoot,"bin")
    if(!createDir(outDir)){
        throwError("Impossible de créer le répertoire <<"+outDir+">> du fichier binaire!!");
    }
    const start = x=>{
       return new Promise((resolve,reject)=>{
          return Promise.resolve(initPromise).finally(()=>{
            cmd = `electron "${electronProjectRoot}"  ${icon ? `--icon ${path.resolve(icon)}`:""} ${isValidUrl(url)? ` --url ${url}`:''}`; //--root ${electronProjectRoot}
            return exec({
              cmd, 
              projectRoot,
            }).then(resolve).catch(reject);
          })
      })
    };
    if(url){
      return start();
    }
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
    Promise.all([Promise.resolve(initPromise),promise]).then(()=>{
      if(!fs.existsSync(buildOutDir) || !fs.existsSync(indexFile)){
         throwError("répertoire d'export web invalide où innexistant ["+buildOutDir+"]");
      }
      switch(script){
          case "start":
             return start();
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
              try {
                writeFile(electronPackagePath,JSON.stringify({...electronPackageJSON,name:packageObj.name||electronPackageJSON.realName||electronPackageJSON.name},null,"\t"));
              } catch{}
                return exec({cmd,projectRoot:electronProjectRoot}).then(()=>{
                  console.log("application package avec succèss");
                }).finally(()=>{
                    try {
                      writeFile(electronPackagePath,JSON.stringify(electronPackageJSON,null,"\t"));
                    } catch{}
                });
            }
           break;
      }
    }).catch((e)=>{
      console.log(e," is cathing ggg");
    }).finally(()=>{
      if(script !=="start"){
        process.exit();
      }
    });
  