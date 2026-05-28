(function(){
  if(window.__SIDEBAR__)return;window.__SIDEBAR__=1;

  window.__DUCK_PANELS__=window.__DUCK_PANELS__||{};

  var ITEMS=[
    {id:"model",icon:"\ud83e\udd16",label:"\u6a21\u578b",color:"#f5a623"},
    {id:"chat",icon:"\ud83d\udcac",label:"\u5bf9\u8bdd",color:"#f5a623"},
    {id:"history",icon:"\ud83d\udccb",label:"\u8bb0\u5f55",color:"#ffa726"},
    {id:"kb",icon:"\ud83d\udcda",label:"\u77e5\u8bc6\u5e93",color:"#4fc3f7"},
    {id:"wechat",icon:"\ud83d\udf02",label:"\u5fae\u4fe1",color:"#07c160"},
    {id:"skills",icon:"\u2728",label:"\u6280\u80fd",color:"#ce93d8"},
    {id:"settings",icon:"\u2699",label:"\u8bbe\u7f6e",color:"#888"}
  ];

  // 侧边栏容器
  var bar=document.createElement("div");
  bar.style.cssText="position:fixed;top:30px;left:0;bottom:0;width:60px;background:rgba(22,18,8,0.97);border-right:1px solid #282218;z-index:99998;display:flex;flex-direction:column;align-items:center;padding:8px 0;gap:2px;font-family:Inter,system-ui,sans-serif;box-shadow:2px 0 10px rgba(0,0,0,0.3);transition:all 0.3s ease";

  // 状态指示器
  var statusDot=document.createElement("div");
  statusDot.style.cssText="width:44px;height:44px;border-radius:8px;display:flex;align-items:center;justify-content:center;cursor:pointer;margin-bottom:6px;transition:background 0.2s";
  statusDot.innerHTML='<span style="width:10px;height:10px;border-radius:50%;background:#666" id="__sbDot"></span>';
  statusDot.title="\u7f51\u5173\u72b6\u6001";
  statusDot.onmouseover=function(){this.style.background="rgba(255,255,255,0.05)"};
  statusDot.onmouseout=function(){this.style.background="transparent"};
  // 状态指示器
  var statusDiv=document.createElement("div");
  statusDiv.style.cssText="width:100%;height:4px;background:linear-gradient(90deg,#4CAF50,#8BC34A);border-radius:2px;margin-bottom:8px;transition:all 0.3s ease";
  statusDiv.title="系统状态";
  bar.appendChild(statusDiv);
  
  // 更新状态指示器
  function updateStatusIndicator() {
    try {
      var cpu=_stats.cpu||0;
      var memory=_stats.memoryPercent||0;
      var avg=(cpu+memory)/2;
      if(avg>80) {
        statusDiv.style.background="linear-gradient(90deg,#f44336,#ff9800)";
      } else if(avg>50) {
        statusDiv.style.background="linear-gradient(90deg,#ff9800,#ffc107)";
      } else {
        statusDiv.style.background="linear-gradient(90deg,#4CAF50,#8BC34A)";
      }
    } catch(e) {}
  }
  
  // 定期更新状态
  setInterval(updateStatusIndicator, 5000);
  updateStatusIndicator();
  
  bar.appendChild(statusDot);

  var sep=document.createElement("div");
  sep.style.cssText="width:32px;height:1px;background:#282218;margin:4px 0";
  bar.appendChild(sep);

  // 工具按钮
  ITEMS.forEach(function(item){
    var el=document.createElement("div");
    el.style.cssText="width:52px;height:52px;border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;transition:all 0.15s;position:relative";
    el.innerHTML='<span style="font-size:20px;line-height:1">'+item.icon+'</span><span style="font-size:10px;color:#666;margin-top:2px">'+item.label+'</span>';
    el.title=item.label;
    el.onmouseover=function(){
      this.style.background="rgba(255,255,255,0.06)";
      this.querySelector("span:last-child").style.color=item.color;
    };
    el.onmouseout=function(){
      this.style.background="transparent";
      this.querySelector("span:last-child").style.color="#666";
    };
    el.onclick=function(e){
      e.stopPropagation();
      if(item.id==="chat"&&window.electronAPI&&window.electronAPI.openChat){window.electronAPI.openChat(true);return;}
      var fn=window.__DUCK_PANELS__&&window.__DUCK_PANELS__[item.id];
      if(fn)fn();
    };
    bar.appendChild(el);
  });

  var spacer=document.createElement("div");
  spacer.style.cssText="flex:1";
  bar.appendChild(spacer);

  // GPU 状态指示（内嵌在侧边栏底部）
  var gpuInfo=document.createElement("div");
  gpuInfo.style.cssText="width:48px;text-align:center;margin-bottom:4px;padding:4px 0;cursor:default";
  gpuInfo.innerHTML='<div style="font-size:14px">\ud83c\udfa6</div><div id="__gpuUtil" style="font-size:9px;color:#555">--</div><div id="__gpuMem" style="font-size:8px;color:#444">--</div>';
  gpuInfo.title="GPU \u5229\u7528\u7387 / \u663e\u5b58";
  bar.appendChild(gpuInfo);

  // 底部致谢
  var credit=document.createElement("div");
  credit.style.cssText="width:44px;height:44px;border-radius:8px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:16px;transition:all 0.15s;margin-bottom:4px";
  credit.textContent="\u2764\ufe0f";
  credit.title="\u5173\u4e8e";
  credit.onmouseover=function(){this.style.background="rgba(255,255,255,0.05)"};
  credit.onmouseout=function(){this.style.background="transparent"};
  credit.onclick=function(){
    var tip=document.getElementById("__creditTip");
    if(tip){tip.style.display=tip.style.display==="none"?"block":"none";return;}
    tip=document.createElement("div");
    tip.id="__creditTip";
    tip.style.cssText="position:fixed;bottom:20px;left:68px;max-width:320px;background:rgba(26,20,8,0.98);border:1px solid #333;border-radius:10px;padding:12px 14px;z-index:99999;font-family:Inter,system-ui,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,0.5)";
    tip.innerHTML='<div style="color:#f5a623;font-size:11px;font-weight:600;margin-bottom:6px">\u611f\u8c22</div><div style="color:#aaa;font-size:11px;line-height:1.6">\u611f\u8c22\u96f7\u603b\u63a8\u51fa\u7684\u5c0f\u7c73\u6a21\u578b\u6fc0\u52b1\u8ba1\u5212\uff0c\u8d60\u9001\u768416\u4ebftoken plan\uff0c\u8ba9\u975e\u4e13\u4e1a\u7684\u6211\u4e5f\u80fd\u62e5\u6709\u521b\u4f5c\u7a7a\u95f4\u3002</div>';
    document.body.appendChild(tip);
    setTimeout(function(){if(tip)tip.style.display="none";},8000);
  };
  bar.appendChild(credit);

  document.body.appendChild(bar);

  // 状态轮询
  var _dot=document.getElementById("__sbDot");
  async function checkStatus(){
    try{
      if(window.electronAPI&&window.electronAPI.getSessionToken){
        var token=await window.electronAPI.getSessionToken();
        var r=await fetch("http://127.0.0.1:9119/api/status",{headers:{"Authorization":"Bearer "+token}});
        if(r.ok){_dot.style.background="#4caf50";return;}
      }
    }catch(e){}
    _dot.style.background="#f44336";
  }
  checkStatus();setInterval(checkStatus,15000);

  // GPU 轮询
  async function checkGpu(){
    try{
      if(window.electronAPI&&window.electronAPI.getGpuStats){
        var gpus=await window.electronAPI.getGpuStats();
        if(gpus&&gpus.length>0){
          var g=gpus[0];
          var memPct=g.memTotal>0?Math.round(g.memUsed/g.memTotal*100):0;
          var u=document.getElementById("__gpuUtil");
          var m=document.getElementById("__gpuMem");
          if(u){u.textContent=g.util+"%";u.style.color=g.util>=90?"#f44336":g.util>=70?"#ffa726":"#4caf50";}
          if(m){m.textContent=memPct+"%";m.style.color=memPct>=90?"#f44336":memPct>=70?"#ffa726":"#555";}
        }
      }
    }catch(e){}
  }
  checkGpu();setInterval(checkGpu,5000);

  // 给主体留出侧边栏空间
  document.body.style.paddingLeft="60px";
})();
