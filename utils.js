var Utils = {
  isEmptyObject: function(e) {
    var t;
    for (t in e)
      return !1;
    return !0
  },
  deepCopy: function(source) {
    var result = {};
    for (var key in source) {
      result[key] = (result[key] instanceof Object ? this.deepCopy(source[key]) : source[key]);
    }
    return result;
  },
  randomCode: function(pullNumber, len) { //是否纯数字,验证码长度.  默认 数字+字母，长度6
    var codeLength = len || 6;
    var code = '';
    var random = new Array(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R',
      'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'); //随机数
    var maxlen = random.length;
    pullNumber && (maxlen = 10);
    for (var i = 0; i < codeLength; i++) { //循环操作  
      var index = Math.floor(Math.random() * maxlen); //取得随机数的索引（0-9/0~35）  
      code += random[index]; //根据索引取得随机数加到code上  
    }
    return code;
  }
}
module.exports = Utils;
