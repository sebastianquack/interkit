var app=function(){"use strict";function t(){}function n(t){return t()}function e(){return Object.create(null)}function o(t){t.forEach(n)}function r(t){return"function"==typeof t}function c(t,n){return t!=t?n==n:t!==n||t&&"object"==typeof t||"function"==typeof t}function u(t,n){t.appendChild(n)}function a(t){return document.createTextNode(t)}let f;function l(t){f=t}const s=[],i=[],d=[],$=[],p=Promise.resolve();let h=!1;function m(t){d.push(t)}function g(){const t=new Set;do{for(;s.length;){const t=s.shift();l(t),y(t.$$)}for(;i.length;)i.pop()();for(let n=0;n<d.length;n+=1){const e=d[n];t.has(e)||(e(),t.add(e))}d.length=0}while(s.length);for(;$.length;)$.pop()();h=!1}function y(t){t.fragment&&(t.update(t.dirty),o(t.before_update),t.fragment.p(t.dirty,t.ctx),t.dirty=null,t.after_update.forEach(m))}const _=new Set;function x(t,n){t.$$.dirty||(s.push(t),h||(h=!0,p.then(g)),t.$$.dirty=e()),t.$$.dirty[n]=!0}function b(c,u,a,s,i,d){const $=f;l(c);const p=u.props||{},h=c.$$={fragment:null,ctx:null,props:d,update:t,not_equal:i,bound:e(),on_mount:[],on_destroy:[],before_update:[],after_update:[],context:new Map($?$.$$.context:[]),callbacks:e(),dirty:null};let y=!1;var b,v,w;h.ctx=a?a(c,p,(t,n)=>{h.ctx&&i(h.ctx[t],h.ctx[t]=n)&&(h.bound[t]&&h.bound[t](n),y&&x(c,t))}):p,h.update(),y=!0,o(h.before_update),h.fragment=s(h.ctx),u.target&&(u.hydrate?h.fragment.l((w=u.target,Array.from(w.childNodes))):h.fragment.c(),u.intro&&((b=c.$$.fragment)&&b.i&&(_.delete(b),b.i(v))),function(t,e,c){const{fragment:u,on_mount:a,on_destroy:f,after_update:l}=t.$$;u.m(e,c),m(()=>{const e=a.map(n).filter(r);f?f.push(...e):o(e),t.$$.on_mount=[]}),l.forEach(m)}(c,u.target,u.anchor),g()),l($)}class v{$destroy(){var n,e;e=1,(n=this).$$.fragment&&(o(n.$$.on_destroy),n.$$.fragment.d(e),n.$$.on_destroy=n.$$.fragment=null,n.$$.ctx={}),this.$destroy=t}$on(t,n){const e=this.$$.callbacks[t]||(this.$$.callbacks[t]=[]);return e.push(n),()=>{const t=e.indexOf(n);-1!==t&&e.splice(t,1)}}$set(){}}function w(n){var e,o,r,c;return{c(){e=function(t){return document.createElement(t)}("h1"),o=a("Hello "),r=a(E),c=a("!")},m(t,n){!function(t,n,e){t.insertBefore(n,e||null)}(t,e,n),u(e,o),u(e,r),u(e,c)},p:t,i:t,o:t,d(t){var n;t&&(n=e).parentNode.removeChild(n)}}}let E="worlds";return new class extends v{constructor(t){super(),b(this,t,null,w,c,[])}}({target:document.body})}();
//# sourceMappingURL=bundle.js.map
