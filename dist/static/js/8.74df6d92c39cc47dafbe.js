webpackJsonp([8],{277:function(t,s,n){function a(t){n(356),n(355)}var o=n(36)(n(327),n(376),a,"data-v-02006132",null);t.exports=o.exports},283:function(t,s,n){t.exports=n.p+"static/img/favicon.55326cd.png"},295:function(t,s){},296:function(t,s,n){s=t.exports=n(269)(!0),s.push([t.i,".bg[data-v-4f57d6b3]{position:fixed;top:0;left:0;width:100%;height:100%;background:linear-gradient(0deg,#0b4182 1%,#1e88e5);z-index:-1}","",{version:3,sources:["/Users/zdy/Workspace/vuejs/vue-project/my-project/src/components/Background.vue"],names:[],mappings:"AACA,qBACE,eAAgB,AAChB,MAAO,AACP,OAAQ,AACR,WAAY,AACZ,YAAa,AACb,oDAA4D,AAC5D,UAAY,CACb",file:"Background.vue",sourcesContent:["\n.bg[data-v-4f57d6b3] {\n  position: fixed;\n  top: 0;\n  left: 0;\n  width: 100%;\n  height: 100%;\n  background: linear-gradient(0deg, #0b4182 1%, #1e88e5 100%);\n  z-index: -1;\n}\n"],sourceRoot:""}])},297:function(t,s,n){var a=n(296);"string"==typeof a&&(a=[[t.i,a,""]]),a.locals&&(t.exports=a.locals);n(270)("6f95dc6d",a,!0)},298:function(t,s,n){function a(t){n(297)}var o=n(36)(n(295),n(299),a,"data-v-4f57d6b3",null);t.exports=o.exports},299:function(t,s){t.exports={render:function(){var t=this,s=t.$createElement;return(t._self._c||s)("div",{staticClass:"bg"})},staticRenderFns:[]}},327:function(t,s,n){"use strict";Object.defineProperty(s,"__esModule",{value:!0}),function(t){var a=n(298),o=n.n(a);n(73);s.default={data:function(){return{msg:{con:"",show:!1},suc:{con:"",show:!1},err:{con:"",show:!1},email:"boxuerixin@qq.com",password:"123456",backRouter:{name:"Index"}}},created:function(){t.backRouter&&t.backRouter.name&&(this.backRouter=t.backRouter),t.Email&&(this.email=t.Email,delete t.Email)},components:{Background:o.a},methods:{signin:function(){if(this.initmsg(),!this.email)return this.msg.con="请输入邮箱",void(this.msg.show=!0);if(!/^(\w-*\.*)+@(\w-?)+(\.\w{2,})+$/.test(this.email))return this.msg.con="邮箱格式不正确",void(this.msg.show=!0);if(!this.password)return this.msg.con="请输入密码",void(this.msg.show=!0);if(this.password.length<6)return this.msg.con="密码不得少于6位",void(this.msg.show=!0);var t=this,s={email:this.email,password:this.password};this.$axios.post("/signin",s).then(function(s){"0000"===s.data.recode?t.suc.show=!0:(t.err.con=s.data.msg,t.err.show=!0)}).catch(function(s){t.err.con=s.toString(),t.err.show=!0})},initmsg:function(){this.msg.con="",this.msg.show=!1,this.err.con="",this.err.show=!1,this.suc.con="",this.suc.show=!1,this.suc.type=""}}}}.call(s,n(1))},337:function(t,s,n){s=t.exports=n(269)(!0),s.push([t.i,"","",{version:3,sources:[],names:[],mappings:"",file:"Signin.vue",sourceRoot:""}])},338:function(t,s,n){s=t.exports=n(269)(!0),s.push([t.i,".link[data-v-02006132]{cursor:pointer;margin-right:10px}.link[data-v-02006132]:hover{color:#333}.logo[data-v-02006132]{margin:30px auto 15px;width:110px}.margintop20[data-v-02006132]{margin-top:20px}.margintop10[data-v-02006132]{margin-top:10px}.signbox[data-v-02006132]{position:absolute;top:100px;left:50%;-webkit-transform:translateX(-50%);transform:translateX(-50%);width:90%;min-height:420px;max-width:420px;min-width:290px;background:#fff;border-radius:5px;text-align:center}.font-black[data-v-02006132]{color:#666}@media screen and (max-width:420px){.signbox[data-v-02006132]{top:30px}}","",{version:3,sources:["/Users/zdy/Workspace/vuejs/vue-project/my-project/src/assets/css/signbox.css"],names:[],mappings:"AACA,uBACC,eAAe,AACf,iBAAmB,CACnB,AACD,6BACC,UAAY,CACZ,AACD,uBACE,sBAAuB,AACvB,WAAa,CACd,AACD,8BACE,eAAiB,CAClB,AACD,8BACE,eAAiB,CAClB,AACD,0BACE,kBAAmB,AACnB,UAAW,AACX,SAAU,AACV,mCAAoC,AAC5B,2BAA4B,AACpC,UAAW,AACX,iBAAkB,AAClB,gBAAiB,AACjB,gBAAiB,AACjB,gBAAoB,AACpB,kBAAmB,AACnB,iBAAmB,CACpB,AACD,6BACE,UAAY,CACb,AACD,oCACA,0BACE,QAAU,CACX,CACA",file:"signbox.css",sourcesContent:["\n.link[data-v-02006132] {\n\tcursor:pointer;\n\tmargin-right: 10px;\n}\n.link[data-v-02006132]:hover{\n\tcolor: #333;\n}\n.logo[data-v-02006132] {\n  margin: 30px auto 15px;\n  width: 110px;\n}\n.margintop20[data-v-02006132] {\n  margin-top: 20px;\n}\n.margintop10[data-v-02006132] {\n  margin-top: 10px;\n}\n.signbox[data-v-02006132] {\n  position: absolute;\n  top: 100px;\n  left: 50%;\n  -webkit-transform: translateX(-50%);\n          transform: translateX(-50%);\n  width: 90%;\n  min-height: 420px;\n  max-width: 420px;\n  min-width: 290px;\n  background: #FFFFFF;\n  border-radius: 5px;\n  text-align: center;\n}\n.font-black[data-v-02006132]{\n  color: #666;\n}\n@media screen and (max-width: 420px) {\n.signbox[data-v-02006132] {\n\t\ttop: 30px;\n}\n}"],sourceRoot:""}])},355:function(t,s,n){var a=n(337);"string"==typeof a&&(a=[[t.i,a,""]]),a.locals&&(t.exports=a.locals);n(270)("25888d5f",a,!0)},356:function(t,s,n){var a=n(338);"string"==typeof a&&(a=[[t.i,a,""]]),a.locals&&(t.exports=a.locals);n(270)("9b17f5e4",a,!0)},376:function(t,s,n){t.exports={render:function(){var t=this,s=t.$createElement,a=t._self._c||s;return a("div",{directives:[{name:"title",rawName:"v-title"}],attrs:{"data-title":"登录"}},[a("Background"),t._v(" "),a("div",{staticClass:"signbox container"},[a("img",{staticClass:"logo",attrs:{src:n(283),alt:""}}),t._v(" "),a("div",{staticClass:"col-xs-12 form-group input-group-lg"},[a("input",{directives:[{name:"model",rawName:"v-model",value:t.email,expression:"email"}],staticClass:"form-control margintop20 ",attrs:{type:"text",placeholder:"请输入邮箱"},domProps:{value:t.email},on:{focus:t.initmsg,input:function(s){s.target.composing||(t.email=s.target.value)}}}),t._v(" "),a("input",{directives:[{name:"model",rawName:"v-model",value:t.password,expression:"password"}],staticClass:"form-control margintop20 ",attrs:{type:"password",placeholder:"请输入密码"},domProps:{value:t.password},on:{focus:t.initmsg,input:function(s){s.target.composing||(t.password=s.target.value)}}}),t._v(" "),a("div",{directives:[{name:"show",rawName:"v-show",value:t.msg.show,expression:"msg.show"}],staticClass:"alert alert-danger margintop20",attrs:{role:"alert"}},[a("b",[t._v(t._s(t.msg.con))])]),t._v(" "),a("button",{staticClass:"btn btn-primary btn-lg btn-block margintop20",attrs:{type:"button"},on:{click:t.signin}},[t._v("登录")]),t._v(" "),a("div",{directives:[{name:"show",rawName:"v-show",value:t.suc.show,expression:"suc.show"}],staticClass:"alert alert-success margintop20",attrs:{role:"alert"}},[a("b",[a("span",[t._v("登录成功。"),a("router-link",{attrs:{to:t.backRouter}},[t._v("返回")])],1)])]),t._v(" "),a("div",{directives:[{name:"show",rawName:"v-show",value:t.err.show,expression:"err.show"}],staticClass:"alert alert-danger margintop20",attrs:{role:"alert"}},[a("b",[t._v(t._s(t.err.con))])]),t._v(" "),a("div",{staticClass:"margintop20"},[a("i",{staticClass:"fa fa-qq fa-lg pull-left font-black link"}),t._v(" "),a("i",{staticClass:"fa fa-weibo fa-lg pull-left font-black link"}),t._v(" "),a("i",{staticClass:"fa fa-weixin fa-lg pull-left font-black link"}),t._v(" "),a("router-link",{staticClass:"font-black pull-right link",attrs:{to:{name:"ChangePassword"}}},[t._v("忘记密码")]),t._v(" "),a("router-link",{staticClass:"font-black pull-right link",attrs:{to:{name:"Signup"}}},[t._v("注册")])],1)])])],1)},staticRenderFns:[]}}});
//# sourceMappingURL=8.74df6d92c39cc47dafbe.js.map