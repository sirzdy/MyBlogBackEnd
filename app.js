var express = require('express');
var fs = require('fs');
var util = require('util');
var path = require('path');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var parseurl = require('parseurl');
var eventproxy = require('eventproxy');
var app = express();
var ObjectId = require('mongodb').ObjectId;

var Utils = require('./utils');
var mongo = require('./mongo');
var mail = require('./mail');
var save = require('./save');

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


// app.use(function(req, res, next) {
//     var views = req.session.views
//     // console.log(req.sessionID);
//     if (!views) {
//         views = req.session.views = {}
//     }
//     // get the url pathname 
//     var pathname = parseurl(req).pathname
//     // count the views 
//     views[pathname] = (views[pathname] || 0) + 1
//     console.log(pathname,views[pathname]);
//     next()
// })


// app.use(cookieParser());
// app.all('/#/index', function(req, res) {
//     // 检查 session 中的 isVisit 字段是否存在
//     // 如果存在则增加一次，否则为 session 设置 isVisit 字段，并初始化为 1。
//     console.log(req.cookies);
//     if (req.cookies.isVisit) {
//         req.cookies.isVisit++;
//         console.log('<p>第 ' + req.cookies.isVisit + '次来此页面</p>');
//     } else {
//         req.cookies.isVisit = 1;
//         console.log("欢迎第一次来这里");
//         console.log("Cookies: ", req.cookies); //打印cookie
//     }
// });


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
    mongo.query("users", { 'email': address }, function(result) {
      if (result.length > 0) {
        sendVercode();
      } else {
        console.log("此账号尚未注册");
        res.send({ 'recode': '5005', 'msg': '此账号尚未注册' });
      }
    });
  } else if (req.body.signup) { //注册
    mongo.query("users", { 'email': address }, function(result) {
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
  if (req.session.vercode.email != email || req.session.vercode.vercode != vercode) {
    res.send({ 'recode': '5100', 'msg': '验证码不正确' });
    return;
  }
  mongo.query("users", { 'email': email }, function(result) {
    delete req.session.vercode;
    if (result.length > 0) {
      console.log("此账号已经被注册");
      res.send({ 'recode': '5004', 'msg': '此账号已经被注册' });
    } else {
      /* users start */
      mongo.insert("users", { email: email, nickname: nickname }, function(result) {
        if (result.result.ok) {
          console.log(result.result);
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
  mongo.query("users", { 'email': email }, function(result) {
    if (result.length > 0) {
      if (!req.session.vercode) {
        res.send({ 'recode': '5200', 'msg': '未获取验证码或验证码已失效' })
        return;
      }
      if (req.session.vercode.email != email || req.session.vercode.vercode != vercode) {
        res.send({ 'recode': '5100', 'msg': '验证码不正确' });
        return;
      }
      /* pwd end*/
      mongo.update("pwds", { email: email }, { $set: { password: password } }, function(result) {
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
      }, function() {
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
  mongo.query("pwds", { "email": req.body.email }, function(result) {
    if (result.length > 0) {
      if (result[0].password == req.body.password) {
        mongo.query('users', { email: req.body.email }, function(result) {
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
    console.log(queryCondition);
    mongo.queryPart("posts", queryCondition, { size: size, page: page }, order, function(result) {
      if (result.list.length > 0) {
        var list = result.list;
        var ep = new eventproxy;
        ep.after('get data', list.length * 2, function() {
          console.log("over");
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
app.post('/save', function(req, res) {
  var post = {
    'title': req.body.title,
    'content': req.body.content,
    'category': req.body.category,
    'tags': req.body.tags
  };
  save.save(post, function(fileName) {
    res.send({ 'recode': '0000', 'msg': '上传成功', 'path': fileName });
  }, function() {
    // res.end(404);
    callerr(res, 4500);
    return;
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
  mongo.insert("comment", param, function(result) {
    if (result.result.ok && result.result.n) {
      console.log("评论成功");
      res.send({ 'recode': '0000', 'msg': '评论成功', 'comment': result.ops[0] });
      return;
    } else {
      callerr(res, 4100);
      return;
    }
  }, function() {
    callerr(res, 4200);
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
    time: new Date()
  }
  mongo.insert("reply", param, function(result) {
      if (result.result.ok && result.result.n) {
        console.log("回复成功");
        res.send({ 'recode': '0000', 'msg': '回复成功', 'reply': result.ops[0] });
        return;
      } else {
        callerr(res, 4100);
        return;
      }
    },
    function() {
      callerr(res, 4200);
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
  mongo.queryPartFull("comment", { postid: query.postid }, { size: size, page: page }, { time: -1 }, function(result) {
    if (result.list.length > 0) {
      var list = result.list;
      var ep = new eventproxy;
      ep.after('get data', list.length, function() {
        res.send({ 'recode': '0000', 'msg': '查询成功', 'res': result });
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
});

app.post("/getReply", function(req, res) {
  var query = req.body;
  var size = query.size || 5;
  var page = query.page || 1;
  mongo.queryPartFull("reply", { "commentid": query.commentid }, { size: size, page: page }, { time: -1 }, function(result) {
    if (result.list.length > 0) {
      var list = result.list;
      var ep = new eventproxy;
      ep.after('get data', list.length, function() {
        res.send({ 'recode': '0000', 'msg': '查询成功', 'res': result });
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
});
/* 评论相关 end */

var server = app.listen(3333, function() {
  var host = server.address().address;
  var port = server.address().port;
  console.log('App listening at http://%s:%s', host, port);
});

// insert
// mongo.insert("users",{'name':'zdy'},function(result){
//     console.log(result);
// })
// update
// mongo.update("users",{'name':'zdy'},{$set:{'name':'myy'}},function(result){
//     console.log(result);
// })
// query
// mongo.query("users",{'name':'myy'},function(result){
//     console.log(result);
// })
// delete
// mongo.delete("users",{'name':'myy'},function(result){
//     console.log(result);
// })

// var birds = require('./birds');
// app.use('/birds', birds);
// app.use('/about',express.static(path.join(__dirname,'about')));
// app.get('/', function (req, res) {
//   res.sendFile('index.html');
// });
// 网站首页接受 POST 请求
// app.post('/', function (req, res) {
//   res.send('Got a POST request');
// });

// /user 节点接受 PUT 请求


// // /user 节点接受 DELETE 请求
// app.delete('/user', function (req, res) {
//   res.send('Got a DELETE request at /user');
// });
