'use strict';

var Queue = require('tiny-queue');
var immediate = require('immediate');
var noop = require('noop-fn');

const WebSQLTransaction = require('./WebSQLTransaction');

var ROLLBACK = [
  {sql: 'ROLLBACK;', args: []}
];

var COMMIT = [
  {sql: 'END;', args: []}
];

// v8 likes predictable objects
function TransactionTask(readOnly, txnCallback, errorCallback, successCallback) {
  this.readOnly = readOnly;
  this.txnCallback = txnCallback;
  this.errorCallback = errorCallback;
  this.successCallback = successCallback;
}

module.exports = function(dbVersion, db){
  const self = this ||{};
  self.version = dbVersion;
  self._db = db;
  self._txnQueue = new Queue();
  self._running = false;
  self._currentTask = null;
  self._runTransaction = function () {
      const txn = WebSQLTransaction(self);
      immediate(function () {
        self._currentTask.txnCallback(txn);
        txn._checkDone();
      });
  }
  self._createTransaction = function(readOnly, txnCallback, errorCallback, successCallback) {
    errorCallback = errorCallback || noop;
    successCallback = successCallback || noop;
  
    if (typeof txnCallback !== 'function') {
      throw new Error('The callback provided as parameter 1 is not a function.');
    }
    self._txnQueue.push(new TransactionTask(readOnly, txnCallback, errorCallback, successCallback));
    return self._runNextTransaction.call(self);
  }
  self._onTransactionComplete = function(err) {
    function done(error) {
      if (error) {
        self._currentTask?.errorCallback(error);
      } else {
        self._currentTask?.successCallback();
      }
      self._running = false;
      self._currentTask = null;
      self._runNextTransaction.call(self);
    }
    function rollbackDone(error) {
      // Ignoring ROLLBACK errors as per
      // https://www.sqlite.org/lang_transaction.html#response_to_errors_within_a_transaction
      return function() {
        done(error);
      };
    }
    function findErrorInResults(results) {
      for (var i = 0; i < results.length; i++) {
        var result = results[i];
        if (result.error) {
          return result.error;
        }
      }
    }
    function commitDone(commitError, results) {
      const error = commitError || findErrorInResults(results) || null;
      if (error) {
        // Explicit ROLLBACK on failed COMMIT as per
        // https://www.sqlite.org/lang_transaction.html#response_to_errors_within_a_transaction
        self._db.exec(ROLLBACK, false, rollbackDone(error));
      } else {
        done();
      }
    }
    if (self._currentTask?.readOnly) {
      done(err); // read-only doesn't require a transaction
    } else if (err) {
      self._db.exec(ROLLBACK, false, rollbackDone(err));
    } else {
      self._db.exec(COMMIT, false, commitDone);
    }
  }
  self.transaction = function (txnCallback, errorCallback, successCallback) {
    return self._createTransaction.call(self,false, txnCallback, errorCallback, successCallback);
  }
  self.readTransaction = function (txnCallback, errorCallback, successCallback) {
    return self._createTransaction.call(self,true, txnCallback, errorCallback, successCallback);
  }
  self._runNextTransaction = function() {
    if (self._running) {
      return;
    }
    const task = self._txnQueue.shift();
    if (!task) {
      return;
    }
    self._currentTask = task;
    self._running = true;
    return self._runTransaction.call(self);
  }
  return self;
};