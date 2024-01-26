'use strict';

const SQLiteDatabase = require('./sqlite/SQLiteDatabase');
const customOpenDatabase = require('./custom');

module.exports = customOpenDatabase(SQLiteDatabase);