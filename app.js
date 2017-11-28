var express = require('express');
var app = express();
var fs = require('fs');

var httpProxy = require('http-proxy');
var proxy = httpProxy.createProxyServer({});

var privateKey = fs.readFileSync('/etc/https/zhangdanyang.com.key', 'utf8');
var certificate = fs.readFileSync('/etc/https/zhangdanyang.com.crt', 'utf8');
var credentials = { key: privateKey, cert: certificate };
var httpsServer = require('https').createServer(credentials, app);

// var io = require('socket.io')(server);
var io = require('socket.io')(httpsServer);
var util = require('util');
var path = require('path');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var parseurl = require('parseurl');
var eventproxy = require('eventproxy');
var ObjectId = require('mongodb').ObjectId;


/*自己的*/
var Utils = require('./core/utils');
var mongo = require('./core/mongo');
var mail = require('./core/mail');
var save = require('./core/save');


// 捕获异常  
proxy.on('error', function(err, req, res) {
  res.writeHead(500, {
    'Content-Type': 'text/plain'
  });
  res.end('Something went wrong. And we are reporting a custom error message.');
});


app.set('trust proxy', true);
app.use(session({
  secret: 'zhangdanyang',
  resave: false,
  saveUninitialized: true
    // cookie: { secure: true }
}))
app.use(express.static(path.join(__dirname, 'files')));
app.use(express.static(path.join(__dirname, 'dist')));
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded



/* ---------------------------------------------- start ---------------------------------------------- */
//系统异常
var callerr = function(res, errcode) {
  //未登录或登录超时
  if (errcode == 5001) {
    res.send({ 'recode': '5001', 'msg': '未登录或登录超时' });
  }
  // 
  if (!errcode || errcode == 4000) {
    res.send({ 'recode': '4000', 'msg': '系统异常' });
  }
  //数据库 操作失败
  if (errcode == 4100) {
    res.send({ 'recode': '4100', 'msg': '系统异常' });
  }
  //数据库 报错
  if (errcode == 4200) {
    res.send({ 'recode': '4200', 'msg': '系统异常' });
  }
  //文件操作 报错
  if (errcode == 4500) {
    res.send({ 'recode': '4500', 'msg': '系统异常' });
  }
};
//校验是否登录
app.all('/check', function(req, res) {
  if (req.session.user) {
    mongo.query("users", { "_id": ObjectId(req.session.user._id) }, function(result) {
      if (result.length > 0) {
        res.send({ 'recode': '0000', 'msg': '登录校验通过', 'user': result[0] });
        return;
      } else {
        res.send({ 'recode': '5003', 'msg': '用户不存在' });
        return;
      }
    }, function() {
      res.send({ 'recode': '5003', 'msg': '用户不存在' });
      return;
    });
  } else {
    callerr(res, 5001);
  }
});
//验证邮箱
app.post('/verifyEmail', function(req, res) {
  var address = req.body.email;
  if (!address) {
    res.send({ 'recode': '6100', 'msg': '邮箱不存在' });
    return;
  } else if (!/^(\w-*\.*)+@(\w-?)+(\.\w{2,})+$/.test(address)) {
    res.send({ 'recode': '6300', 'msg': '邮箱格式不正确' });
    return;
  }

  if (req.body.changePassword) { //修改
    mongo.query("users", { "email": { $regex: "^" + address + "$", $options: "i" } }, function(result) {
      if (result.length > 0) {
        sendVercode();
      } else {
        console.log("此账号尚未注册");
        res.send({ 'recode': '5005', 'msg': '此账号尚未注册' });
      }
    });
  } else if (req.body.signup) { //注册
    mongo.query("users", { "email": { $regex: "^" + address + "$", $options: "i" } }, function(result) {
      if (result.length > 0) {
        console.log("此账号已经被注册");
        res.send({ 'recode': '5004', 'msg': '此账号已经被注册' });
      } else {
        sendVercode();
      }
    });
  }

  function sendVercode() {
    var randomCode = Utils.randomCode(true, 6); //纯数字，6位长度
    var param = { address: address, randomCode: randomCode };
    mail.verifyEmail(param, function(info) {
      req.session.vercode = { email: address, vercode: randomCode };
      res.send({ 'recode': '0000', 'msg': '发送验证码成功' });
      return;
    }, function(error) {
      res.send({ 'recode': '4300', 'msg': '发送验证码失败' });
      return;
    });
  }
});
//注册
app.post('/signup', function(req, res) {
  var email = req.body.email;
  var vercode = req.body.vercode;
  var nickname = req.body.nickname;
  var password = req.body.password;
  if (!nickname) {
    res.send({ 'recode': '6010', 'msg': '昵称不得为空' });
    return;
  }
  if (nickname.length > 20) {
    res.send({ 'recode': '6011', 'msg': '昵称不得超过20位' });
    return;
  }
  if (!email) {
    res.send({ 'recode': '6012', 'msg': '邮箱不得为空' });
    return;
  }
  if (!vercode) {
    res.send({ 'recode': '6013', 'msg': '验证码不得为空' });
    return;
  }
  if (!password) {
    res.send({ 'recode': '6014', 'msg': '密码不得为空' });
    return;
  }
  if (!req.session.vercode) {
    res.send({ 'recode': '5200', 'msg': '未获取验证码或验证码已失效' })
    return;
  }
  if (!new RegExp("^" + email + "$", 'i').test(req.session.vercode.email) || req.session.vercode.vercode != vercode) {
    res.send({ 'recode': '5100', 'msg': '验证码不正确' });
    return;
  }
  password = Utils.digest(Utils.decrypt(password));
  mongo.query("users", { "email": { $regex: "^" + email + "$", $options: "i" } }, function(result) {
    delete req.session.vercode;
    if (result.length > 0) {
      console.log("此账号已经被注册");
      res.send({ 'recode': '5004', 'msg': '此账号已经被注册' });
    } else {
      /* users start */
      mongo.insert("users", { email: email, nickname: nickname }, function(result) {
        if (result.result.ok) {
          /* pwd start*/
          mongo.insert("pwds", { email: email, password: password }, function(result) {
            if (result.result.ok) {
              console.log("注册成功");
              res.send({ 'recode': '0000', 'msg': '注册成功' });
              return;
            } else {
              callerr(res, 4100);
              return;
            }
          }, function() {
            callerr(res, 4200)
            return;
          });
          /* pwd end */
        } else {
          callerr(res, 4100);
          return;
        }
      }, function() {
        callerr(res, 4200)
        return;
      });
      /* users end */
    }
  }, function() {
    callerr(res, 4200)
    return;
  })
});
//修改密码
app.post('/changePassword', function(req, res) {
  var email = req.body.email;
  var vercode = req.body.vercode;
  var password = req.body.password;
  if (!email) {
    res.send({ 'recode': '6012', 'msg': '邮箱不得为空' });
    return;
  }
  if (!vercode) {
    res.send({ 'recode': '6013', 'msg': '验证码不得为空' });
    return;
  }
  if (!password) {
    res.send({ 'recode': '6014', 'msg': '密码不得为空' });
    return;
  }
  password = Utils.digest(Utils.decrypt(password));
  mongo.query("users", {
      email: { $regex: "^" + email + "$", $options: "i" }
    },
    function(result) {
      if (result.length > 0) {
        if (!req.session.vercode) {
          res.send({ 'recode': '5200', 'msg': '未获取验证码或验证码已失效' })
          return;
        }
        if (!new RegExp("^" + email + "$", 'i').test(req.session.vercode.email) || req.session.vercode.vercode != vercode) {
          res.send({ 'recode': '5100', 'msg': '验证码不正确' });
          return;
        }
        /* pwd end*/
        mongo.update("pwds", {
            email: { $regex: "^" + email + "$", $options: "i" }
          }, { $set: { password: password } },
          function(result) {
            delete req.session.vercode;
            if (!result.result.n) {
              res.send({ 'recode': '5005', 'msg': '此账号尚未注册' });
              return;
            } else if (result.result.ok) {
              res.send({ 'recode': '0000', 'msg': '修改成功' });
              return;
            } else {
              callerr(res, 4100);
              return;
            }
          },
          function() {
            callerr(res, 4200)
            return;
          });
        /* pwd end */
      } else {
        console.log("此账号尚未注册");
        res.send({ 'recode': '5005', 'msg': '此账号尚未注册' });
        return;
      }
    });

});
//登录
app.post('/signin', function(req, res) {
  var param = { "email": { $regex: "^" + req.body.email + "$", $options: "i" } }
  var password = Utils.digest(Utils.decrypt(req.body.password));
  mongo.query("pwds", param, function(result) {
    if (result.length > 0) {
      if (result[0].password == password) {
        mongo.query('users', param, function(result) {
          var user = result[0];
          req.session.user = { _id: user._id, email: user.email };
          console.log(req.connection.remoteAddress);
          res.send({ 'recode': '0000', 'msg': '登录成功' });
          return;
        })
      } else {
        res.send({ 'recode': '5002', 'msg': '密码错误' });
        return;
      }
    } else {
      res.send({ 'recode': '5003', 'msg': '用户不存在' });
      return;
    }
  }, function() {
    callerr(res, 4200)
    return;
  })
});
//登出
app.post('/signout', function(req, res) {
  req.session.user = null;
  res.send({ 'recode': '0000', 'msg': '登出成功' });
  return;
}); /* 个人信息相关 start */
//修改基本信息
app.post('/saveInf', function(req, res) {
  var inf = {};
  req.body.nickname && (inf.nickname = req.body.nickname);
  req.body.birthday && (inf.birthday = req.body.birthday);
  req.body.sex && (inf.sex = req.body.sex);
  req.body.blog && (inf.blog = req.body.blog);
  req.body.avatar && (inf.avatar = req.body.avatar);
  if (!req.session.user._id) {

    callerr(res, 5001);
    return;
  }
  mongo.update("users", { '_id': ObjectId(req.session.user._id) }, { $set: inf }, function(result) {
    if (!result.result.n) {
      res.send({ 'recode': '5005', 'msg': '未找到相关记录，保存失败' });
      return;
    } else if (result.result.ok) {
      res.send({ 'recode': '0000', 'msg': '保存成功' });
      return;
    } else {
      callerr(res, 4100);
      return;
    }
  }, function() {
    callerr(res, 4200);
    return;
  })
});
app.post('/avatar', function(req, res) {
  if (!req.session.user) {
    callerr(res, 5001);
    return;
  } else {
    var likeid = req.session.user._id;
  }
  save.avatar(req, function(avatarPath) {
    res.send({ 'recode': '0000', 'msg': '上传成功', 'path': avatarPath });
  }, function(err) {
    callerr(res, 4500);
    return;
  });
});
/* 个人信息相关 end */

//查询作者
app.post('/getAuthor', function(req, res) {
  mongo.query("users", { "_id": ObjectId(req.body._id) }, function(result) {
    if (result.length > 0) {
      res.send({ 'recode': '0000', 'msg': '查询作者成功', 'user': result[0] });
      return;
    } else {
      res.send({ 'recode': '5003', 'msg': '作者不存在' });
      return;
    }
  }, function() {
    callerr(res, 4200)
    return;
  })
});
app.post('/like', function(req, res) {
  if (!req.session.user) {
    callerr(res, 5001);
    return;
  } else {
    var likeid = req.session.user._id;
  }
  mongo.query("posts", { "_id": ObjectId(req.body._id), "like": likeid }, function(result) {
    if (result.length > 0) {
      res.send({ 'recode': '5051', 'msg': '已经喜欢过了，不能重复点赞' });
      return;
    } else {
      mongo.update("posts", { "_id": ObjectId(req.body._id) }, { '$push': { "like": likeid } }, function(result) {
        if (!result.result.n) {
          res.send({ 'recode': '5030', 'msg': '添加喜欢失败，请稍后重试' });
          return;
        } else if (result.result.ok) {
          mongo.query("posts", { "_id": ObjectId(req.body._id) }, function(result) {
            if (result.length > 0) {
              res.send({ 'recode': '0000', 'msg': '喜欢成功', 'like': result[0].like });

              //推送喜欢消息
              var to = result[0].author;
              mongo.query("users", { "_id": ObjectId(likeid) }, function(r) { //查询发送消息的人信息
                var mes = {
                  msg: '<b>【' + r[0].nickname + '】</b>' + '喜欢了你的文章<b>《' + result[0].title + '》</b>',
                  postid: req.body._id
                };
                var insertMsg = {
                  to: to,
                  from: likeid,
                  postid: mes.postid,
                  msg: mes.msg,
                  hasRead: false,
                  time: new Date()
                }
                mongo.insert("msgs", insertMsg, function(result) {
                  if (result.result.ok) {
                    mes._id = result.ops[0]._id;
                    sendMsg(to, mes);
                    return;
                  } else {
                    callerr(res, 4100);
                    return;
                  }
                }, function() {
                  callerr(res, 4200);
                  return;
                });
              })
              return;
            } else {
              res.send({ 'recode': '5050', 'msg': '获取喜欢数量失败' });
              return;
            }
          });
        } else {
          callerr(res, 4100);
          return;
        }
      }, function() {
        callerr(res, 4200);
        return;
      })
    }
  });
});
//发表文章
app.post('/publish', function(req, res) {
  var post = {
    'title': req.body.title,
    'content': req.body.content,
    'category': req.body.category,
    'tags': req.body.tags,
    'publishTime': new Date(),
    'updateTime': new Date()
  }
  if (!post.title) {
    res.send({ 'recode': '6001', 'msg': '标题不得为空' });
    return;
  }
  if (!post.category) {
    res.send({ 'recode': '6002', 'msg': '类别不得为空' });
    return;
  }
  if (!post.content) {
    res.send({ 'recode': '6003', 'msg': '正文不得为空' });
    return;
  }
  if (!req.session.user) {
    callerr(res, 5001);
    return;
  } else {
    post.author = req.session.user._id;
  }
  mongo.insert("posts", post, function(result) {
    if (result.result.ok) {
      console.log("发布成功");
      res.send({ 'recode': '0000', 'msg': '发布成功', '_id': result.insertedIds[0] });
      return;
    } else {
      callerr(res, 4100);
      return;
    }
  }, function() {
    callerr(res, 4200);
    return;
  });
});
//更新文章
app.post('/update', function(req, res) {
  var post = {
    'title': req.body.title,
    'content': req.body.content,
    'category': req.body.category,
    'tags': req.body.tags,
    'updateTime': new Date()
  }
  if (!post.title) {
    res.send({ 'recode': '6001', 'msg': '标题不得为空' });
    return;
  }
  if (!post.category) {
    res.send({ 'recode': '6002', 'msg': '类别不得为空' });
    return;
  }
  if (!post.content) {
    res.send({ 'recode': '6003', 'msg': '正文不得为空' });
    return;
  }
  if (!req.session.user) {
    callerr(res, 5001);
    return;
  } else {
    post.author = req.session.user._id;
  }
  mongo.update("posts", { '_id': ObjectId(req.body._id) }, { $set: post }, function(result) {
    if (!result.result.n) {
      res.send({ 'recode': '5005', 'msg': '未找到相关记录，修改失败' });
      return;
    } else if (result.result.ok) {
      res.send({ 'recode': '0000', 'msg': '修改成功' });
      return;
    } else {
      callerr(res, 4100);
      return;
    }
  }, function() {
    callerr(res, 4200);
    return;
  })
});
//获取草稿
app.post('/getDrafts', function(req, res) {
  var author;
  if (!req.session.user) {
    callerr(res, 5001);
    return;
  } else {
    author = req.session.user._id;
  }
  mongo.query("drafts", { 'author': author }, function(result) {
    for (var i in result) {
      delete result[i].content;
    }
    res.send({ 'recode': '0000', 'msg': '获取草稿成功', 'list': result });
  })
});
//载入草稿
app.post('/loadDraft', function(req, res) {
  var author;
  if (!req.session.user) {
    callerr(res, 5001);
    return;
  } else {
    author = req.session.user._id;
  }
  mongo.query("drafts", { 'author': author, '_id': ObjectId(req.body._id) }, function(result) {
    if (result.length > 0) {
      res.send({ 'recode': '0000', 'msg': '获取草稿成功', 'draft': result[0] });
      return;
    } else {
      res.send({ 'recode': '5005', 'msg': '未找到相关记录' });
      return;
    }
  })
});
//清空草稿箱
app.post('/deleteDrafts', function(req, res) {
  var author;
  if (!req.session.user) {
    callerr(res, 5001);
    return;
  } else {
    author = req.session.user._id;
  }
  mongo.deleteMany("drafts", { 'author': author }, function(result) {
    if (result.result.ok) {
      res.send({ 'recode': '0000', 'msg': '清空草稿箱成功' });
    }
  }, function() {
    callerr(res, 4200);
    return;
  })
});
//删除草稿
app.post('/deleteDraft', function(req, res) {
  var author;
  if (!req.session.user) {
    callerr(res, 5001);
    return;
  } else {
    author = req.session.user._id;
  }
  mongo.delete("drafts", { 'author': author, "_id": ObjectId(req.body._id) }, function(result) {
    if (!result.result.n) {
      res.send({ 'recode': '5005', 'msg': '未找到相关记录，删除失败' });
      return;
    } else if (result.result.ok) {
      res.send({ 'recode': '0000', 'msg': '删除成功' });
      return;
    }
  })
});
//保存
app.post('/saveDraft', function(req, res) {
  var post = {
    'title': req.body.title,
    'content': req.body.content,
    'category': req.body.category,
    'tags': req.body.tags,
    'saveTime': new Date()
  }
  if (!req.session.user) {
    callerr(res, 5001);
    return;
  } else {
    post.author = req.session.user._id;
  }
  if (req.body._id) {
    mongo.query("drafts", { 'postid': req.body._id }, function(result) {
      if (result.length > 0) {
        mongo.update("drafts", { 'postid': req.body._id }, { $set: post }, function(result) {
          if (!result.result.n) {
            res.send({ 'recode': '5005', 'msg': '未找到相关记录， 保存失败' });
            return;
          } else if (result.result.ok) {
            res.send({ 'recode': '0000', 'msg': '保存草稿成功，原草稿被覆盖' });
            return;
          } else {
            callerr(res, 4100);
            return;
          }
        }, function() {
          callerr(res, 4200);
          return;
        })
        return;
      } else {
        post.postid = req.body._id;
        mongo.insert("drafts", post, function(result) {
          if (result.result.ok) {
            res.send({ 'recode': '0000', 'msg': '保存草稿成功', '_id': result.insertedIds[0] });
            return;
          } else {
            callerr(res, 4100);
            return;
          }
        }, function() {
          callerr(res, 4200);
          return;
        });
        return;
      }
    })
  } else {
    mongo.insert("drafts", post, function(result) {
      if (result.result.ok) {
        console.log("保存成功");
        res.send({ 'recode': '0000', 'msg': '保存新草稿成功', '_id': result.insertedIds[0] });
        return;
      } else {
        callerr(res, 4100);
        return;
      }
    }, function() {
      callerr(res, 4200);
      return;
    });
  }
});
//删除
app.post('/delete', function(req, res) {
  mongo.delete("posts", { "_id": ObjectId(req.body._id) }, function(result) {
    if (!result.result.n) {
      res.send({ 'recode': '5005', 'msg': '未找到相关记录，删除失败' });
      return;
    } else if (result.result.ok) {
      res.send({ 'recode': '0000', 'msg': '删除成功' });
      return;
    }
  })
});
//增加新分类
app.post('/addCategoryName', function(req, res) {
  var addCategoryName = req.body.addCategoryName;
  mongo.query("categories", { 'name': { $regex: "^" + addCategoryName + "$", $options: "i" } }, function(result) {
    if (result.length > 0) {
      res.send({ 'recode': '5010', 'msg': '此类别已经存在' });
      return;
    } else {
      mongo.insert('categories', { 'name': addCategoryName }, function(result) {
        if (result.result.ok && result.result.n) {
          console.log("增加分类成功");
          res.send({ 'recode': '0000', 'msg': '增加成功', '_id': result.insertedIds[0] });
          return;
        } else {
          callerr(res, 4100);
          return;
        }
      }, function() {
        callerr(res, 4200);
      })
      return;
    }
  }, function() {
    callerr(res, 4200)
    return;
  });
});
// 查询所有分类
app.post('/getCategories', function(req, res) {
  mongo.query("categories", {}, function(result) {
    if (result.length > 0) {
      res.send({ 'recode': '0000', 'msg': '查询分类成功', 'categories': result });
      return;
    } else {
      res.send({ 'recode': '5011', 'msg': '暂无分类，请添加分类' });
      return;
    }
  }, function() {
    callerr(res, 4200)
    return;
  })
});
// 查询分类
app.post('/getCategory', function(req, res) {
  mongo.query("categories", { '_id': ObjectId(req.body._id) }, function(result) {
    if (result.length > 0) {
      res.send({ 'recode': '0000', 'msg': '查询分类成功', 'category': result[0] });
      return;
    } else {
      res.send({ 'recode': '5012', 'msg': '查询分类失败' });
      return;
    }
  }, function() {
    callerr(res, 4200)
    return;
  })
});
//根据条件查询文章
app.post('/search', function(req, res) {
  var query = req.body;
  /*{
      keyword
      title
      content
      author
      category
      tags
      publishTime publishTimeStart publishTimeEnd
      updateTime updateTimeStart updateTimeEnd

  }*/
  //分页
  var size = query.size || 5;
  var page = query.page || 1;
  var order = query.order ? query.order : { publishTime: -1 };
  if (query.author) {
    mongo.query('users', { '$or': [{ nickname: { $regex: query.author, $options: "i" } }, { email: { $regex: query.author, $options: "i" } }] }, function(result) {
      query.author = [];
      for (var i = 0, len = result.length; i < len; i++) {
        query.author.push(result[i]._id.toString());
      }
      search();
    })
  } else {
    search();
  }

  function search() {
    var queryCondition = {};
    if (query.keyword) {
      queryCondition.$or = [{ title: { $regex: query.keyword, $options: "i" } }, { content: { $regex: query.keyword, $options: "i" } }]
    }
    if (query.title) {
      queryCondition.title = { $regex: query.title, $options: "i" }
    }
    if (query.content) {
      queryCondition.content = { $regex: query.content, $options: "i" }
    }
    //作者部分匹配，不区分大小写
    if (query.author) {
      queryCondition.author = { $in: query.author };
    }
    //分类完全匹配
    if (query.category) {
      queryCondition.category = { $regex: "^" + query.category + "$", $options: "i" };
    }
    //包含一个即可
    if (query.tags) {
      queryCondition.tags = query.tags
    }
    if (query.publishTimeStart || query.publishTimeEnd) {
      queryCondition.publishTime = {};
      if (query.publishTimeStart) {
        queryCondition.publishTime.$gte = new Date(query.publishTimeStart)
      }
      if (query.publishTimeEnd) {
        queryCondition.publishTime.$lte = new Date(query.publishTimeEnd)
      }
    }
    if (query.updateTimeStart || query.updateTimeEnd) {
      queryCondition.updateTime = {};
      if (query.updateTimeStart) {
        queryCondition.updateTime.$gte = new Date(query.updateTimeStart)
      }
      if (query.updateTimeEnd) {
        queryCondition.updateTime.$lte = new Date(query.updateTimeEnd)
      }
    }
    mongo.queryPart("posts", queryCondition, { size: size, page: page }, order, function(result) {
      if (result.list.length > 0) {
        var list = result.list;
        var ep = new eventproxy;
        ep.after('get data', list.length * 2, function() {
          res.send({ 'recode': '0000', 'msg': '查询成功', 'res': result });
        })
        for (var i in list) {
          // 分类
          (function(num) {
            mongo.query("categories", { "_id": ObjectId(list[num].category) }, function(r) {
              if (r.length > 0) {
                list[num].category = r[0];
                ep.emit('get data');
                return;
              }
            });
          })(i);
        }
        for (var i in list) {
          // 评论
          (function(num) {
            mongo.query("comment", { "postid": list[num]._id.toString() }, function(r) {
              list[num].comment = r.length;
              ep.emit('get data');
              return;
            });
          })(i);
        }
        return;
      } else {
        res.send({ 'recode': '5005', 'msg': '未找到相关记录' });
        return;
      }
    })
  }
});

//保存到本地
app.post('/download', function(req, res) {
  var post = {
    'title': req.body.title,
    'content': req.body.content,
    'category': req.body.category,
    'tags': req.body.tags
  };
  save.download(post, function(fileName) {
    res.send({ 'recode': '0000', 'msg': '下载成功', 'path': fileName });
  }, function() {
    // res.end(404);
    callerr(res, 4500);
    return;
  });
});
//保存我的全部文章到本地
app.post('/downloadMyPosts', function(req, res) {
  var param = {};
  if (!req.session.user) {
    callerr(res, 5001);
    return;
  } else {
    param.author = req.session.user._id
  }
  mongo.getMyPosts(param, function(result) {
    if (result.length > 0) {
      save.downloadMyPosts(result, function(fileName) {
        res.send({ 'recode': '0000', 'msg': '下载成功', 'path': fileName });
      }, function() {
        callerr(res, 4500);
        return;
      });
      return;
    } else {
      res.send({ 'recode': '5005', 'msg': '抱歉，没有找到您的文章' });
      return;
    }
  });
});
//文章内容
app.post('/getPost', function(req, res) {
  var post = { "_id": ObjectId(req.body._id) }
  mongo.update("posts", post, { $inc: { view: 1 } }, function(result) {
    if (result.result.n && result.result.ok) {
      mongo.query("posts", post, function(result) {
        if (result.length > 0) {
          res.send({ 'recode': '0000', 'msg': '查询成功', 'post': result[0] });
          return;
        } else {
          res.send({ 'recode': '5005', 'msg': '未找到相关记录' });
          return;
        }
      });
    } else {
      callerr(res, 4100);
      return;
    }
  }, function() {
    callerr(res, 4200);
    return;
  });
});

/* 评论相关 start */
app.post('/comment', function(req, res) {
  if (!req.session.user) {
    callerr(res, 5001);
    return;
  } else {
    var userid = req.session.user._id;
  }
  var param = {
    userid: userid,
    postid: req.body.postid,
    content: req.body.content,
    time: new Date()
  }
  mongo.query('comment', { postid: req.body.postid }, function(result) {
    param.floor = result.length ? result.length + 1 : 1;
    mongo.insert("comment", param, function(result) {
      if (result.result.ok && result.result.n) {
        console.log("评论成功");
        res.send({ 'recode': '0000', 'msg': '评论成功', 'comment': result.ops[0] });

        var comment = result.ops[0];
        var ep = new eventproxy;
        var post = {},
          commentator = {},
          to;
        ep.after('get data', 2, function() {
          var mes = {
            msg: '<b>【' + commentator.nickname + '】</b>' + '评论了你的文章<b>《' + post.title + '》</b>:' + comment.content,
            postid: comment.postid,
            commentid: comment._id,
            floor: comment.floor
          };
          var insertMsg = {
            to: to,
            from: userid,
            postid: mes.postid,
            msg: mes.msg,
            commentid: comment._id,
            hasRead: false,
            time: comment.time,
            floor: comment.floor
          };
          //存储数据库
          mongo.insert("msgs", insertMsg, function(result) {
            if (result.result.ok) {
              mes._id = result.ops[0]._id;
              // 推送评论消息
              sendMsg(to, mes);
              return;
            } else {
              callerr(res, 4100);
              return;
            }
          }, function() {
            callerr(res, 4200);
            return;
          });
        })
        mongo.query("posts", { "_id": ObjectId(req.body.postid) }, function(result) { //查询收取消息的人的_id
          to = result[0].author;
          post = result[0];
          ep.emit('get data');
        })
        mongo.query("users", { "_id": ObjectId(userid) }, function(result) { //查询发送消息的人信息
          commentator = result[0];
          ep.emit('get data');
        })
        return;
      } else {
        callerr(res, 4100);
        return;
      }
    }, function() {
      callerr(res, 4200);
    })
  })
});
/*回复*/
app.post('/reply', function(req, res) {
  if (!req.session.user) {
    callerr(res, 5001);
    return;
  } else {
    var userid = req.session.user._id;
  }
  var param = {
    userid: userid,
    postid: req.body.postid,
    commentid: req.body.commentid,
    content: req.body.content,
    atid: req.body.atid,
    time: new Date()
  }
  mongo.query('reply', { postid: req.body.postid }, function(result) {
    param.floor = result.length ? result.length + 1 : 1;
    mongo.insert("reply", param, function(result) {
      if (result.result.ok && result.result.n) {
        console.log("回复成功");
        res.send({ 'recode': '0000', 'msg': '回复成功', 'reply': result.ops[0] });

        var reply = result.ops[0];
        var ep = new eventproxy;
        var post = {},
          commentator = {},
          replier = {};
        ep.after('get data', 3, function() {
          { //作者的消息
            let to = post.author;
            let mes = {
              msg: '<b>【' + replier.nickname + '】</b>' + '回复了你的文章<b>《' + post.title + '》</b>的评论:' + reply.content,
              postid: comment.postid,
              // commentid: comment._id,
              replyid: reply._id,
              floor: comment.floor,
              flr: reply.floor
            };
            let insertMsg = {
              to: to,
              from: userid,
              postid: mes.postid,
              msg: mes.msg,
              // commentid: comment._id,
              replyid: reply._id,
              hasRead: false,
              time: reply.time,
              floor: comment.floor,
              flr: reply.floor
            };
            //存储数据库
            mongo.insert("msgs", insertMsg, function(result) {
              if (result.result.ok) {
                mes._id = result.ops[0]._id;
                // 推送评论消息
                sendMsg(to, mes);
                return;
              } else {
                callerr(res, 4100);
                return;
              }
            }, function() {
              callerr(res, 4200);
              return;
            });
          }
          if (comment.userid != post.author) { //评论者的消息
            let to = comment.userid;
            let mes = {
              msg: '<b>【' + replier.nickname + '】</b>' + '回复了文章<b>《' + post.title + '》</b>下你的评论:' + reply.content,
              postid: comment.postid,
              // commentid: comment._id,
              replyid: reply._id,
              floor: comment.floor,
              flr: reply.floor
            };
            let insertMsg = {
              to: to,
              from: userid,
              postid: mes.postid,
              msg: mes.msg,
              // commentid: comment._id,
              replyid: reply._id,
              hasRead: false,
              time: reply.time,
              flr: comment.floor,
              floor: reply.floor
            };
            //存储数据库
            mongo.insert("msgs", insertMsg, function(result) {
              if (result.result.ok) {
                mes._id = result.ops[0]._id;
                // 推送评论消息
                sendMsg(to, mes);
                return;
              } else {
                callerr(res, 4100);
                return;
              }
            }, function() {
              callerr(res, 4200);
              return;
            });
          }
          if (req.body.atid && req.body.atid != post.author && req.body.atid != comment.userid) { // @
            let to = req.body.atid;
            let mes = {
              msg: '<b>【' + replier.nickname + '】</b>' + '回复了文章<b>《' + post.title + '》</b>的评论下你的回复:' + reply.content,
              postid: comment.postid,
              // commentid: comment._id,
              replyid: reply._id,
              floor: comment.floor,
              flr: reply.floor
            };
            let insertMsg = {
              to: to,
              from: userid,
              postid: mes.postid,
              msg: mes.msg,
              // commentid: comment._id,
              replyid: reply._id,
              hasRead: false,
              time: reply.time,
              floor: comment.floor,
              flr: reply.floor
            };
            //存储数据库
            mongo.insert("msgs", insertMsg, function(result) {
              if (result.result.ok) {
                mes._id = result.ops[0]._id;
                // 推送评论消息
                sendMsg(to, mes);
                return;
              } else {
                callerr(res, 4100);
                return;
              }
            }, function() {
              callerr(res, 4200);
              return;
            });
          }
        })
        mongo.query("posts", { "_id": ObjectId(req.body.postid) }, function(result) { //查询作者与文章
          post = result[0];
          ep.emit('get data');
        })
        mongo.query("comment", { "_id": ObjectId(req.body.commentid) }, function(result) { //查询评论的人信息
          comment = result[0];
          ep.emit('get data');
        })

        mongo.query("users", { "_id": ObjectId(userid) }, function(result) { //查询回复者，发送消息的人信息
          replier = result[0];
          ep.emit('get data');
        })

        return;
      } else {
        callerr(res, 4100);
        return;
      }
    }, function() {
      callerr(res, 4200);
    });
  });

});
app.post('/getMsgs', function(req, res) {
  if (!req.session.user) {
    callerr(res, 5001);
    return;
  } else {
    var userid = req.session.user._id;
  }
  var param = { "to": userid }
  if (!req.body.getAll) {
    param.hasRead = false;
  }
  mongo.query("msgs", param, function(result) {
    res.send({ 'recode': '0000', 'msg': '查询成功', 'list': result })
  }, function() {
    callerr(res, 4200);
    return;
  })
});
app.post('/readMsg', function(req, res) {
  if (!req.session.user) {
    callerr(res, 5001);
    return;
  } else {
    var userid = req.session.user._id;
  }
  mongo.update("msgs", { "_id": ObjectId(req.body._id) }, { $set: { hasRead: true } }, function(result) {
    if (result.result.ok) {
      res.send({ 'recode': '0000', 'msg': '标记已读成功' });
    }
  }, function() {
    callerr(res, 4200);
    return;
  })
});
app.post('/readMsgs', function(req, res) {
  if (!req.session.user) {
    callerr(res, 5001);
    return;
  } else {
    var userid = req.session.user._id;
  }
  mongo.updateMany("msgs", { "to": userid, hasRead: false }, { $set: { hasRead: true } }, function(result) {
    if (result.result.ok) {
      res.send({ 'recode': '0000', 'msg': '标记已读成功' });
    }
  }, function() {
    callerr(res, 4200);
    return;
  })
});
app.post('/likeComment', function(req, res) {
  if (!req.session.user) {
    callerr(res, 5001);
    return;
  } else {
    var likeid = req.session.user._id;
  }
  mongo.query("comment", { "_id": ObjectId(req.body._id), "like": likeid }, function(result) {
    if (result.length > 0) {
      res.send({ 'recode': '5051', 'msg': '已经喜欢过了，不能重复点赞' });
      return;
    } else {
      mongo.update("comment", { "_id": ObjectId(req.body._id) }, { '$push': { "like": likeid } }, function(result) {
        if (!result.result.n) {
          res.send({ 'recode': '5030', 'msg': '添加喜欢失败，请稍后重试' });
          return;
        } else if (result.result.ok) {
          mongo.query("comment", { "_id": ObjectId(req.body._id) }, function(result) {
            if (result.length > 0) {
              res.send({ 'recode': '0000', 'msg': '喜欢成功', 'like': result[0].like });
              return;
            } else {
              res.send({ 'recode': '5050', 'msg': '获取喜欢数量失败' });
              return;
            }
          });
        } else {
          callerr(res, 4100);
          return;
        }
      }, function() {
        callerr(res, 4200);
        return;
      })
    }
  });
});

app.post('/getComment', function(req, res) {
  var query = req.body;
  var size = query.size || 5;
  var page = query.page || 1;

  if (req.body.floor) {
    mongo.query('comment', { postid: req.body.postid }, function(result) {
      page = Math.floor((result.length - req.body.floor) / size) + 1;
      getComment();
    })
  } else {
    getComment();
  }

  function getComment() {
    mongo.queryPartFull("comment", { postid: query.postid }, { size: size, page: page }, { time: -1 }, function(result) {
      if (result.list.length > 0) {
        var list = result.list;
        var ep = new eventproxy;
        ep.after('get data', list.length, function() {
          res.send({ 'recode': '0000', 'msg': '查询成功', 'res': result, 'page': page });
        })
        for (var i in list) {
          // 评论人
          (function(num) {
            mongo.query("users", { "_id": ObjectId(list[num].userid) }, function(r) {
              if (r.length > 0) {
                list[num].user = r[0];
                ep.emit('get data');
                return;
              }
            });
          })(i);
        }
        return;
      } else {
        res.send({ 'recode': '5005', 'msg': '未找到相关评论' });
        return;
      }
    })
  }

});

app.post("/getReply", function(req, res) {
  var query = req.body;
  var size = query.size || 5;
  var page = query.page || 1;
  if (req.body.flr) {
    mongo.query('reply', { postid: req.body.postid }, function(result) {
      page = Math.floor((result.length - req.body.flr) / size) + 1;
      getReply();
    })
  } else {
    getReply();
  }

  function getReply() {
    mongo.queryPartFull("reply", { "commentid": query.commentid }, { size: size, page: page }, { time: -1 }, function(result) {
      if (result.list.length > 0) {
        var list = result.list;
        var ep = new eventproxy;
        ep.after('get data', list.length, function() {
          res.send({ 'recode': '0000', 'msg': '查询成功', 'res': result, 'page': page });
        })
        for (var i in list) {
          // 评论人
          (function(num) {
            mongo.query("users", { "_id": ObjectId(list[num].userid) }, function(r) {
              if (r.length > 0) {
                list[num].user = r[0];
                ep.emit('get data');
                return;
              }
            });
          })(i);
        }
        return;
      } else {
        res.send({ 'recode': '5005', 'msg': '未找到相关回复' });
        return;
      }
    });
  }

});
/* 评论相关 end */
/* ---------------------------------------------- end ---------------------------------------------- */

/* ---------------------------------------------- socket io start ---------------------------------------------- */




// var users = [];//所有人
var chatList = []; //所有sockets，禁止多处登录
var roomList = [{ name: '官方聊天室' }];
var rooms = {}; //用户 list 
var speakers = []; // chat  列表
var msg = io.of('msg');
msg.on('connection', function(socket) {
  console.log('connection', socket.id);
  setTimeout(function() {
    socket.emit('msg info');
  }, 100);
  socket.on('msg info', function(data) {
    socket.info = data;
    socket.info.id = socket.id;
  });
})

function sendMsg(to, mes) {
  var allSockets = msg.sockets;
  if (typeof to == 'string') {
    for (var i in allSockets) {
      if (!allSockets[i].info) return;
      if (to == allSockets[i].info._id) {
        allSockets[i].emit('mes', mes);
      }
    }
  } else if (typeof to == 'object') {
    for (var i in allSockets) {
      for (var j in to) {
        if (to[j] == allSockets[i].info._id) {
          allSockets[i].emit('mes', mes);
        }
      }
    }
  }
}





var chat = io.of('chat');
chat.on('connection', function(socket) {
  console.log('connection', socket.id);

  function initSockets() {
    var allSockets = chat.sockets;
    chatList = [];
    for (var i in allSockets) {
      let info = allSockets[i].info;
      chatList.push(info);
    }
  }

  function getRoomUsers(room) {
    var allSockets = chat.sockets;
    var res = [];
    for (var i in allSockets) {
      if (allSockets[i].rooms[room] == room) {
        res.push(allSockets[i].info);
      }
    }
    return res;
  }

  socket.on('chat info', function(data) {
    socket.info = data;
    socket.info.id = socket.id;
    initSockets();
    chat.emit('log in', { logInInfo: socket.info, chatList: chatList, roomList: roomList });
  });
  // socket.on('log in', function() {
  //   io.emit('log in', { logInInfo: socket.info, chatList: chatList, roomList: roomList });
  // })
  socket.on('chat list', function() {
    initSockets();
    chat.emit('chat list', chatList);
  });
  socket.on('room list', function() {
    initSockets();
    chat.emit('room list', roomList);
  });
  socket.on('add room', function(addRoomName) {
    if (addRoomName == '') {
      return;
    }
    for (var i in roomList) {
      if (roomList[i].name == addRoomName) {
        socket.emit('room exist', addRoomName);
        return;
      }
    }
    roomList.push({ name: addRoomName, creator: socket.info._id });
    chat.emit('room list', roomList);
  });
  socket.on('remove room', function(removeRoomName) {
    for (var i in roomList) {
      if (roomList[i].name == removeRoomName && roomList[i].creator == socket.info._id) {
        roomList.splice(i, 1);
      }
    }
    chat.emit('room list', roomList);
  });
  socket.on('enter room', function(room) {
    socket.join(room, function() {
      chat.to(room).emit('enter room', { user: socket.info, room: room, time: new Date(), roomUsers: getRoomUsers(room) });
    });
  });
  socket.on('leave room', function(room) {
    socket.leave(room, function() {
      chat.to(room).emit('leave room', { user: socket.info, room: room, time: new Date(), roomUsers: getRoomUsers(room) });
    });
  });
  socket.on('chat room send', function(data) {
    var mes = data;
    mes.time = new Date();
    chat.to(data.room).emit('chat receive', mes);
  });
  socket.on('chat person send', function(data) {
    var mes = data;
    mes.time = new Date();
    var allSockets = chat.sockets;
    socket.emit('chat receive self', mes);
    for (var i in allSockets) {
      if (data.to == allSockets[i].info._id) {
        allSockets[i].emit('chat receive', mes);
      }
    }
  });
  socket.on('disconnect', function(data) {
    initSockets();
    chat.emit('chat list', chatList);
    console.log('disconnect');
  });
  setTimeout(function() {
    socket.emit('chat info');
  }, 100);
});
// /* ---------------------------------------------- socket io end ---------------------------------------------- */

// 使用 80 接口
// var server = require('http').createServer(app);
var server = require('http').createServer(function(req, res) {
  // 在这里可以自定义你的路由分发  
  var host = req.headers.host,
    ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  console.log("client ip:" + ip + ", host:" + host);
  switch (host) {
    case 'zhangdanyang.com':
      proxy.web(req, res, { target: 'https://zhangdanyang.com' });
      break;
    case 'www.zhangdanyang.com':
      proxy.web(req, res, { target: 'https://zhangdanyang.com' });
      break;
    // case 'localhost':
    //   proxy.web(req, res, { target: 'https://localhost.com' });
    //   break;
    // case '127.0.0.1':
    //   proxy.web(req, res, { target: 'https://localhost.com' });
    //   break;
    default:
      res.writeHead(200, {
        'Content-Type': 'text/plain'
      });
      res.end('Welcome to my server!');
  }
});
server.listen(80, function() {
  var host = server.address().address;
  var port = server.address().port;
  console.log('App listening at http://%s:%s', host, port);
});

// 使用 443 接口，通过nginx转发80到443
httpsServer.listen(443, function() {
  var host = httpsServer.address().address;
  var port = httpsServer.address().port;
  console.log('App listening at http://%s:%s', host, port);
});
