'use strict';
const nodemailer = require('nodemailer');
// create reusable transporter object using the default SMTP transport
// let transporter = nodemailer.createTransport({
//     host: 'smtp.mxhichina.com',
//     port: 465,
//     secure: true, // secure:true for port 465, secure:false for port 587
//     auth: {
//         user: 'zhangdanyang@zhangdanyang.com',
//         pass: 'PEAKshine1225!'
//     }
// });


var mail = {
  // postAddress:'boxuerixin@hotmail.com',
  // transporter: nodemailer.createTransport({
  //   host: 'smtp-mail.outlook.com',
  //   port: 587,
  //   secure: false, // secure:true for port 465, secure:false for port 587
  //   auth: {
  //     user: 'boxuerixin@hotmail.com',
  //     pass: '08312009DABCEFKL'
  //   }
  // }),
  postAddress: 'zhangdanyang@zhangdanyang.com',
  transporter: nodemailer.createTransport({
    host: 'smtp.mxhichina.com',
    port: 465,
    secure: true, // secure:true for port 465, secure:false for port 587
    auth: {
      user: 'zhangdanyang@zhangdanyang.com',
      pass: 'PEAKshine1225!'
    }
  }),
  verifyEmail: function(info, callback, callerr) { //info 收件人，验证码
    console.log(info)
    let mailOptions = {
      from: '"张丹阳" <' + this.postAddress + '>', // sender address
      to: info.address, // list of receivers
      subject: 'Welocme!', // Subject line
      text: '您的验证码是：' + info.randomCode, // plain text body
      html: '<p>亲爱的用户，您好：</p><p>您的验证码是：<b>' + info.randomCode + '</b></p>' // html body
    };
    this.transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return console.log(error);
      }
      // console.log('Message %s sent: %s', info.messageId, info.response);
      callback(info);
      return;
    });
  }
}
module.exports = mail;
