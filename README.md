这是基于 NodeJS+MongoDB+VueJS+Socket 等技术与框架搭建的[个人博客](zhangdanyang.com)。

[前端源码](https://github.com/sirzdy/MyBlogFrontEnd)

[后端源码+前端打包后代码](https://github.com/sirzdy/MyBlogBackEnd)

## 技术要点

后端

* NodeJS
* Express

前端

* VueJS （官方vue-cli，webpack打包）
* jQuery
* Bootstrap
* font-awesome

通信

* socket.io

数据库

* MongoDB

## 运行

    # 启动mongodb
    mongod
    # 运行项目（此处建议使用 pm2）
    node app.js / pm2 start app.js

## 功能介绍

### 注册登录
1. 使用 `nodemailer` 实现邮箱注册
2. 使用 `express-session` 实现 session 管理
3. 使用 `rsa` 加密实现 密码加密传输，并在后台解密后取摘要存储数据库

### 撰写文章

1. 使用markdown语法书写文章，实现实时预览
2. 使用`showdown.js`解析md语法
3. 文章存储在数据库
4. 可以进行保存草稿，然后从草稿箱载入保存的草稿

### 文章阅读检索

1. 支持文章查找，高级模式支持多种条件查找

### 发表评论，评论回复

1. 实现富文本编辑器评论回复框

### 消息通知

1. 使用 `socket.io` 实现消息及时通知，包括文章被评论，评论被回复等。

### 聊天

1. 使用 `socket.io` 实现聊天
2. 在线即时聊天，查看在线成员列表、群组列表，可以1v1聊天或者群聊（可自动建群）
3. 云端不保存聊天记录

### 小工具

待完善。。。

## 已知bug

1. 聊天与评论回复在移动端会经常跳出键盘
