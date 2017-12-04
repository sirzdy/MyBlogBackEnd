var uploader = Qiniu.uploader({
  runtimes: 'html5,flash,html4', // 上传模式，依次退化
  browse_button: 'pickfiles', // 上传选择的点选按钮，必需
  // 在初始化时，uptoken，uptoken_url，uptoken_func三个参数中必须有一个被设置
  // 切如果提供了多个，其优先级为uptoken > uptoken_url > uptoken_func
  // 其中uptoken是直接提供上传凭证，uptoken_url是提供了获取上传凭证的地址，如果需要定制获取uptoken的过程则可以设置uptoken_func
  // uptoken : '<Your upload token>', // uptoken是上传凭证，由其他程序生成
  uptoken_url: '/uptoken', // Ajax请求uptoken的Url，强烈建议设置（服务端提供）
  // uptoken_func: function(file){    // 在需要获取uptoken时，该方法会被调用
  //    // do something
  //    return uptoken;
  // },
  get_new_uptoken: false, // 设置上传文件的时候是否每次都重新获取新的uptoken
  // downtoken_url: '/downtoken',
  // Ajax请求downToken的Url，私有空间时使用，JS-SDK将向该地址POST文件的key和domain，服务端返回的JSON必须包含url字段，url值为该文件的下载地址
  unique_names: true, // 默认false，key为文件名。若开启该选项，JS-SDK会为每个文件自动生成key（文件名）
  // save_key: true,                  // 默认false。若在服务端生成uptoken的上传策略中指定了sava_key，则开启，SDK在前端将不对key进行任何处理
  domain: 'http://orvm1p4c8.bkt.clouddn.com/', // bucket域名，下载资源时用到，必需
  container: 'container', // 上传区域DOM ID，默认是browser_button的父元素
  // max_file_size: '2mb', // 最大文件体积限制
  //flash_swf_url: 'path/of/plupload/Moxie.swf', //引入flash，相对路径
  max_retries: 3, // 上传失败最大重试次数
  dragdrop: true, // 开启可拖曳上传
  drop_element: 'container', // 拖曳上传区域元素的ID，拖曳文件或文件夹后可触发上传
  chunk_size: '0mb', // 分块上传时，每块的体积
  auto_start: true, // 选择文件后自动上传，若关闭需要自己绑定事件触发上传
  // 可以使用该参数来限制上传文件的类型，大小等，该参数以对象的形式传入，它包括三个属性：
  filters: {
    max_file_size: '2mb',
    prevent_duplicates: true,
    // Specify what files to browse for
    mime_types: [
      // { title: "flv files", extensions: "flv" }, // 限定flv后缀上传格式上传
      // { title: "Video files", extensions: "flv,mpg,mpeg,avi,wmv,mov,asf,rm,rmvb,mkv,m4v,mp4" }, // 限定flv,mpg,mpeg,avi,wmv,mov,asf,rm,rmvb,mkv,m4v,mp4后缀格式上传
      { title: "Image files", extensions: "jpg,gif,png,bmp,jpeg" }, // 限定jpg,gif,png后缀上传
      // { title: "Zip files", extensions: "zip" } // 限定zip后缀上传
    ]
  },
  //x_vars : {
  //    查看自定义变量
  //    'time' : function(up,file) {
  //        var time = (new Date()).getTime();
  // do something with 'time'
  //        return time;
  //    },
  //    'size' : function(up,file) {
  //        var size = file.size;
  // do something with 'size'
  //        return size;
  //    }
  //},
  init: {
    'FilesAdded': function(up, files) {
      $('table').show();
      $('#success').hide();
      plupload.each(files, function(file) {
        var progress = new FileProgress(file, 'fsUploadProgress');
        progress.setStatus("等待...");
        progress.bindUploadCancel(up);
      });
    },
    'BeforeUpload': function(up, file) {
      // 每个文件上传前，处理相关的事情
      var progress = new FileProgress(file, 'fsUploadProgress');
      var chunk_size = plupload.parseSize(this.getOption('chunk_size'));
      if (up.runtime === 'html5' && chunk_size) {
        progress.setChunkProgess(chunk_size);
      }
    },
    'UploadProgress': function(up, file) {
      // 每个文件上传时，处理相关的事情
      var progress = new FileProgress(file, 'fsUploadProgress');
      var chunk_size = plupload.parseSize(this.getOption('chunk_size'));
      progress.setProgress(file.percent + "%", file.speed, chunk_size);
    },
    'FileUploaded': function(up, file, info) {
      var progress = new FileProgress(file, 'fsUploadProgress');
      progress.setComplete(up, info);
      // 每个文件上传成功后，处理相关的事情
      // 其中info是文件上传成功后，服务端返回的json，形式如：
      // {
      //    "hash": "Fh8xVqod2MQ1mocfI4S4KpRL6D98",
      //    "key": "gogopher.jpg"
      //  }
      // 查看简单反馈
      // var domain = up.getOption('domain');
      // var res = parseJSON(info);
      // var sourceLink = domain +"/"+ res.key; 获取上传成功后的文件的Url
    },
    'Error': function(up, err, errTip) {
      //上传出错时，处理相关的事情
      $('table').show();
      var progress = new FileProgress(err.file, 'fsUploadProgress');
      progress.setError();
      progress.setStatus(errTip);
    },
    'UploadComplete': function() {
      $('#success').show();
    },
    // 'Key': function(up, file) {
    //     // 若想在前端对每个文件的key进行个性化处理，可以配置该函数
    //     // 该配置必须要在unique_names: false，save_key: false时才生效
    //     var key = "";
    //     // do something with key here
    //     return key
    // }
  }
});
//上传成功
// uploader.bind('FileUploaded', function() {
//     console.log('hello man,a file is uploaded');
// });
$('body').on('click', 'table button.btn', function() {
  $(this).parents('tr').next().toggle();
});
// domain为七牛空间对应的域名，选择某个空间后，可通过 空间设置->基本设置->域名设置 查看获取

// uploader为一个plupload对象，继承了所有plupload的方法
