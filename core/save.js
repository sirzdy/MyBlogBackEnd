var fs = require('fs');
var multiparty = require('multiparty');
var archiver = require('archiver');
var Utils = require('./utils');
var mongo = require('./mongo');
var eventproxy = require('eventproxy');

const staticPath = process.cwd() + '/files/';
const savePath = 'save/';
const avatarPath = 'avatar/';
var save = {
  downloadMyPosts: function(posts, callback, callerr) {
    var save = this;
    var zipName = Utils.guid();
    var dir = staticPath + savePath + zipName;
    if (!fs.existsSync(staticPath + savePath)) {
      fs.mkdirSync(staticPath + savePath);
    }
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
    var ep = new eventproxy;
    ep.after('write ok', posts.length, function() {
      // create a file to stream archive data to.
      var output = fs.createWriteStream(dir + '.zip');
      var archive = archiver('zip', {
        zlib: { level: 9 } // Sets the compression level.
      });

      // listen for all archive data to be written
      // 'close' event is fired only when a file descriptor is involved
      output.on('close', function() {
        console.log(archive.pointer() + ' total bytes');
        console.log('archiver has been finalized and the output file descriptor has closed.');
        callback(savePath + zipName + '.zip');
      });

      // This event is fired when the data source is drained no matter what was the data source.
      // It is not part of this library but rather from the NodeJS Stream API.
      // @see: https://nodejs.org/api/stream.html#stream_event_end
      output.on('end', function() {
        console.log('Data has been drained');
        callerr && callerr();
      });

      // good practice to catch warnings (ie stat failures and other non-blocking errors)
      archive.on('warning', function(err) {
        if (err.code === 'ENOENT') {
          // log warning
        } else {
          // throw error
          throw err;
        }
      });

      // good practice to catch this error explicitly
      archive.on('error', function(err) {
        throw err;
        callerr && callerr();
      });

      // pipe archive data to the file
      archive.pipe(output);

      // append files from a sub-directory, putting its contents at the root of archive
      archive.directory(dir + '/', false);

      // finalize the archive (ie we are done appending files but streams have to finish yet)
      // 'close', 'end' or 'finish' may be fired right after calling this method so register to them beforehand
      archive.finalize();
    });
    var titles = [];
    posts.forEach(function(post) {
      var path = post.title;
      var num = 0;
      (function checkAndWrite() {
        if (titles.indexOf(path) < 0) {
          titles.push(path);
          var title = post.title || '';
          var category = mongo.queryCategoryName(post.category) || '未分类';
          var tags = post.tags && post.tags.join(";").replace(/;/g, "\r\n- ") || '';
          var content = post.content || '';
          var con = "---\r\ntitle: " + title + "\r\ndate: " + Utils.formatTime(post.publishTime) + "\r\ncategory:\r\n- " + category + "\r\ntags:\r\n- " + tags + "\r\n---\r\n\r\n" + content;
          fs.writeFile(dir + '/' + path + '.md', con, (err) => {
            if (err) {
              callerr && callerr();
              throw err;
              return;
            }
            ep.emit('write ok');
          });
        } else {
          num++;
          path = post.title + '-' + num;
          checkAndWrite();
        }
      })();
    });
  },
  download: function(param, callback, callerr) {
    if (!fs.existsSync(staticPath + savePath)) {
      fs.mkdirSync(staticPath + savePath);
    }
    var title = param.title || '';
    var category = param.category || '';
    var tags = param.tags && param.tags.replace(/;/g, "\r\n- ") || '';
    var content = param.content || '';
    var filename = (title || 'NOTITLE') + '(' + Date.now() + ')' + '.md';
    var con = "---\r\ntitle: " + title + "\r\ndate: " + Utils.formatTime(new Date()) + "\r\ncategory:\r\n- " + category + "\r\ntags:\r\n- " + tags + "\r\n---\r\n\r\n" + content;
    fs.writeFile(staticPath + savePath + filename, con, (err) => {
      if (err) {
        callerr && callerr();
        throw err;
        return;
      }
      callback && callback(savePath + filename);
    });
  },
  avatar: function(req, callback, callerr) {
    if (!fs.existsSync(staticPath + avatarPath)) {
      fs.mkdirSync(staticPath + avatarPath);
    }
    var form = new multiparty.Form();
    form.parse(req, function(err, fields, files) {
      var filesTmp = JSON.stringify(files, null, 2);
      if (err) {
        console.log('parse error: ' + err);
        callerr && callerr(err)
      } else {
        console.log('parse files: ' + filesTmp);
        // upload 需要与网页中的input的name属性相同
        var uploadedPath = files.avatar[0].path;
        var dstPath = avatarPath + Date.now() + '.png';
        //重命名为真实文件名
        fs.rename(uploadedPath, staticPath + dstPath, function(err) {
          if (err) {
            console.log('rename error: ' + err);
            callerr && callerr(err);
          } else {
            console.log('rename ok');
            callback && callback(dstPath);
          }
        });
      }
    });
  }
};
module.exports = save;
