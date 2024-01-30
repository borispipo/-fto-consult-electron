'use strict';
const immediate = require('immediate');
const SQLiteDatabase = require('./sqlite/SQLiteDatabase');
const WebSQLDatabase = require('./websql/WebSQLDatabase');

module.exports = function openDatabase(dbName,dbVersion,description,size,callback,onError) {
    if(typeof dbName !=="string" || !dbName){
      throw new Error(`Nom de base de données pouchdb electron invalide!! le nom de la base de donnés doit être une chaine de caractère non nulle`);
    }
    dbVersion = typeof dbVersion =="number" || typeof dbVersion =="string" ? dbVersion : 1;
    try {
      const db = new WebSQLDatabase(dbVersion, new SQLiteDatabase(dbName));
      if (typeof callback === 'function') {
        immediate(function () {
          callback(db);
        });
      }
      return db;
    } catch(e){
      console.log(e," creating electron pouchdb");
      if(typeof onError =="function"){
        onError(e);
      }
      return null;
    }
}