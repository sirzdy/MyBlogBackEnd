var Utils = require('./utils')

var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var DB_CONN_STR = 'mongodb://localhost:27017/runoob';
var mongo = {
  insert: function(col, data, callback, callerr) {
    MongoClient.connect(DB_CONN_STR, function(err, db) {
      var collection = db.collection(col);
      collection.insert(data, function(err, result) {
        if (err) {
          console.log('Error:' + err);
          callerr && callerr();
          return;
        }
        callback(result);
        db.close();
      });
    });
  },
  delete: function(col, whereStr, callback, callerr) {
    MongoClient.connect(DB_CONN_STR, function(err, db) {
      var collection = db.collection(col);
      collection.deleteOne(whereStr, function(err, result) {
        if (err) {
          console.log('Error:' + err);
          callerr && callerr();
          return;
        }
        callback(result);
        db.close();
      });
    });
  },
  update: function(col, whereStr, updateStr, callback, callerr) {
    MongoClient.connect(DB_CONN_STR, function(err, db) {
      var collection = db.collection(col);
      console.log(whereStr)
      console.log(updateStr)
      collection.updateOne(whereStr, updateStr, function(err, result) {
        if (err) {
          console.log('Error:' + err);
          callerr && callerr();
          return;
        }
        callback(result);
        db.close();
      });
    });
  },
  updateMany: function(col, whereStr, updateStr, callback, callerr) {
    MongoClient.connect(DB_CONN_STR, function(err, db) {
      var collection = db.collection(col);
      console.log(whereStr)
      console.log(updateStr)
      collection.updateMany(whereStr, updateStr, function(err, result) {
        if (err) {
          console.log('Error:' + err);
          callerr && callerr();
          return;
        }
        callback(result);
        db.close();
      });
    });
  },
  query: function(col, whereStr, callback, callerr) {
    MongoClient.connect(DB_CONN_STR, function(err, db) {
      var collection = db.collection(col);
      collection.find(whereStr).toArray(function(err, result) {
        if (err) {
          console.log('Error:' + err);
          callerr && callerr();
          return;
        }
        callback(result);
        db.close();
      });
    });
  },
  queryPart: function(col, whereStr, part, order, callback, callerr) {
    var page = part.page;
    var size = part.size;
    console.log(whereStr);

    function getPart(result) {
      var res = {};
      res.list = result.slice((page - 1) * size, page * size);
      for (var i in res.list) {
        if (res.list[i].content.length > 300) {
          res.list[i].content = res.list[i].content.substring(0, 300) + "…";
        }
      }
      res.totalSize = result.length;
      res.start = (page - 1) * size - 0 + 1;
      res.end = res.start + res.list.length - 1;
      return res;
    }
    MongoClient.connect(DB_CONN_STR, function(err, db) {
      var collection = db.collection(col);
      collection.find(whereStr).sort(order).toArray(function(err, result) {
        if (err) {
          console.log('Error:' + err);
          callerr && callerr();
          return;
        }
        callback(getPart(result));
        db.close();
      });
    });
    // if (Utils.isEmptyObject(whereStr)) {
    //   console.log('Empty')
    //   MongoClient.connect(DB_CONN_STR, function(err, db) {
    //     var collection = db.collection(col);
    //     collection.find(whereStr).skip((page - 1) * size).limit(size).toArray(function(err, result) {
    //       if (err) {
    //         console.log('Error:' + err);
    //         callerr && callerr();
    //         return;
    //       }
    //       callback(getPart(result));
    //       db.close();
    //     });
    //   });
    // } else {
    //   MongoClient.connect(DB_CONN_STR, function(err, db) {
    //     var collection = db.collection(col);
    //     collection.find(whereStr).toArray(function(err, result) {
    //       if (err) {
    //         console.log('Error:' + err);
    //         callerr && callerr();
    //         return;
    //       }
    //       callback(getPart(result));
    //       db.close();
    //     });
    //   })
    // }
  },
  queryPartFull: function(col, whereStr, part, order, callback, callerr) {
    var page = part.page;
    var size = part.size;
    console.log(whereStr);
    MongoClient.connect(DB_CONN_STR, function(err, db) {
      var collection = db.collection(col);
      collection.find(whereStr).count(function(err, count) {
        if (err) {
          console.log('Error:' + err);
          callerr && callerr();
          return;
        }
        var totalSize = count;
        collection.find(whereStr).sort(order).skip((page - 1) * size).limit(size).toArray(function(err, result) {
          if (err) {
            console.log('Error:' + err);
            callerr && callerr();
            return;
          }
          callback({ totalSize: totalSize, list: result });
          db.close();
        });
      });
    });
  }
}
module.exports = mongo;
