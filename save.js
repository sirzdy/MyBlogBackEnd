var fs = require('fs');
var multiparty = require('multiparty');
const staticPath = 'files/';
const savePath = 'save/';
const avatarPath = 'avatar/';
var save = {
  save: function(param, callback, callerr) {
    var title = param.title || '';
    var category = param.category || '';
    var tags = param.tags || '';
    var content = param.content || '';
    var filename = (title || 'NOTITLE') + '(' + Date.now() + ')' + '.md';
    var con = "---\r\ntitle: " + title + "\r\ncategory: " + category + "\r\ntags: " + tags + "\r\n---\r\n" + content;
    fs.writeFile(staticPath + savePath + filename, con, (err) => {
      if (err) {
        callerr && callerr();
        throw err;
        return;
      }
      console.log('The file has been saved!');
      callback && callback(savePath + filename);
    });
  },
  avatar: function(req, callback, callerr) {
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
