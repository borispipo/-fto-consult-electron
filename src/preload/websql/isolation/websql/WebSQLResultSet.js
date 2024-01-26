'use strict';

function WebSQLRows(array) {
  const self = this || {};
  self._array = array;
  self.length = array.length;
  self.item = function (i) {
    return self._array[i];
  };
  return self;
}

function WebSQLResultSet(insertId, rowsAffected, rows) {
  const self = this ||{};
  self.insertId = insertId;
  self.rowsAffected = rowsAffected;
  self.rows = WebSQLRows(rows);
  return self;
}

module.exports = WebSQLResultSet;