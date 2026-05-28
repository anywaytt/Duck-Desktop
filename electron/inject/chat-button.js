(function(){
  if(window.__DBTN__)return;window.__DBTN__=1;
  var b=document.createElement("div");
  b.style.cssText="position:fixed;bottom:20px;right:20px;width:50px;height:50px;border-radius:50%;background:#f5a623;color:#1a1408;font-size:24px;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:99999;box-shadow:0 2px 10px rgba(0,0,0,.3);transition:transform .2s";
  b.textContent="\u{1F4AC}";
  b.title="\u65b0\u5bf9\u8bdd";
  b.onmouseover=function(){b.style.transform="scale(1.1)"};
  b.onmouseout=function(){b.style.transform="scale(1)"};
  b.onclick=function(){if(window.electronAPI)window.electronAPI.openChat(true)};
  document.body.appendChild(b);
})()