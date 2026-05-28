(function(){
  if(window.__CONNBAR__)return;window.__CONNBAR__=1;

  var bar=document.createElement("div");
  bar.style.cssText="position:fixed;top:0;left:60px;right:0;height:30px;background:rgba(26,20,8,0.97);border-bottom:1px solid #333;display:flex;align-items:center;justify-content:space-between;padding:0 16px;z-index:99999;font-family:Inter,system-ui,sans-serif;font-size:11px;-webkit-app-region:drag";

  var left=document.createElement("div");
  left.style.cssText="display:flex;align-items:center;gap:8px;-webkit-app-region:no-drag";
  var dot=document.createElement("span");
  dot.style.cssText="width:7px;height:7px;border-radius:50%;display:inline-block";
  var txt=document.createElement("span");
  txt.style.cssText="color:#888;cursor:pointer";
  txt.title="\u70b9\u51fb\u91cd\u8fde";
  left.appendChild(dot);left.appendChild(txt);

  var right=document.createElement("div");
  right.style.cssText="display:flex;align-items:center;gap:6px;-webkit-app-region:no-drag";
  var gwBtn=document.createElement("button");
  gwBtn.style.cssText="background:none;border:1px solid #444;color:#888;padding:2px 8px;border-radius:4px;font-size:10px;cursor:pointer";
  gwBtn.textContent="\u7f51\u5173";
  var chatBtn=document.createElement("button");
  chatBtn.style.cssText="background:none;border:1px solid #444;color:#888;padding:2px 8px;border-radius:4px;font-size:10px;cursor:pointer";
  chatBtn.textContent="\u5bf9\u8bdd";
  chatBtn.onclick=function(){if(window.electronAPI&&window.electronAPI.openChat)window.electronAPI.openChat(true);};
  // 窗口控制按钮
  var winControls=document.createElement("div");
  winControls.style.cssText="display:flex;align-items:center;gap:2px;margin-left:8px";
  var minBtn=document.createElement("button");
  minBtn.style.cssText="background:none;border:none;color:#888;width:28px;height:20px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:14px;border-radius:3px";
  minBtn.textContent="\u2013";
  minBtn.title="\u6700\u5c0f\u5316";
  minBtn.onmouseover=function(){this.style.background="#333"};
  minBtn.onmouseout=function(){this.style.background="none"};
  minBtn.onclick=function(){if(window.electronAPI)window.electronAPI.minimize()};
  var maxBtn=document.createElement("button");
  maxBtn.style.cssText="background:none;border:none;color:#888;width:28px;height:20px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:14px;border-radius:3px";
  maxBtn.textContent="\u25a1";
  maxBtn.title="\u6700\u5927\u5316";
  maxBtn.onmouseover=function(){this.style.background="#333"};
  maxBtn.onmouseout=function(){this.style.background="none"};
  maxBtn.onclick=function(){if(window.electronAPI)window.electronAPI.maximize()};
  var closeBtn=document.createElement("button");
  closeBtn.style.cssText="background:none;border:none;color:#888;width:28px;height:20px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:14px;border-radius:3px";
  closeBtn.textContent="\u00d7";
  closeBtn.title="\u5173\u95ed";
  closeBtn.onmouseover=function(){this.style.background="#f44336";this.style.color="white"};
  closeBtn.onmouseout=function(){this.style.background="none";this.style.color="#888"};
  closeBtn.onclick=function(){if(window.electronAPI)window.electronAPI.close()};
  winControls.appendChild(minBtn);winControls.appendChild(maxBtn);winControls.appendChild(closeBtn);
  var resetBtn=document.createElement("button");
  resetBtn.style.cssText="background:none;border:1px solid #444;color:#888;padding:2px 8px;border-radius:4px;font-size:10px;cursor:pointer";
  resetBtn.textContent="\u2699";resetBtn.title="\u521d\u59cb\u5316";
  resetBtn.onmouseover=function(){this.style.borderColor="#f5a623";this.style.color="#f5a623"};
  resetBtn.onmouseout=function(){this.style.borderColor="#444";this.style.color="#888"};
  resetBtn.onclick=function(){
    resetBtn.textContent="...";
    // 清除聊天窗口 localStorage
    try{localStorage.removeItem("duck_sessions");localStorage.removeItem("duck_memory");localStorage.removeItem("duck_chat_history");}catch(e){}
    // 重启 gateway
    if(window.electronAPI&&window.electronAPI.runHermesCmd){
      window.electronAPI.runHermesCmd(["gateway","restart"]).then(function(){
        resetBtn.textContent="\u2713";resetBtn.style.color="#4caf50";
        setTimeout(function(){resetBtn.textContent="\u2699";resetBtn.style.color="#888";},2000);
      }).catch(function(){
        resetBtn.textContent="\u2717";resetBtn.style.color="#f44336";
        setTimeout(function(){resetBtn.textContent="\u2699";resetBtn.style.color="#888";},2000);
      });
    }
  };
  right.appendChild(resetBtn);right.appendChild(gwBtn);right.appendChild(chatBtn);right.appendChild(winControls);
  bar.appendChild(left);bar.appendChild(right);
  document.body.appendChild(bar);

  var online=false,checking=false,failCount=0,maxRetries=3;
  var ONLINE_INTERVAL=15000,OFFLINE_INTERVAL=5000,RETRY_DELAY=2000;

  function setOnline(v){
    online=v;
    if(v){
      failCount=0;
      dot.style.background="#4caf50";
      txt.textContent="\u5df2\u8fde\u63a5";
      txt.style.color="#4caf50";
    }else{
      dot.style.background="#f44336";
      txt.textContent="\u79bb\u7ebf - \u70b9\u51fb\u8fde\u63a5";
      txt.style.color="#f44336";
    }
  }

  function setReconnecting(){
    dot.style.background="#ffa726";
    txt.textContent="\u91cd\u8fde\u4e2d...";
    txt.style.color="#ffa726";
  }

  async function checkConn(){
    if(checking)return;checking=true;
    var success=false;
    for(var attempt=0;attempt<maxRetries;attempt++){
      try{
        var token="";
        if(window.electronAPI&&window.electronAPI.getSessionToken)token=await window.electronAPI.getSessionToken();
        var controller=new AbortController();
        var timer=setTimeout(function(){controller.abort();},8000);
        var r=await fetch("http://127.0.0.1:9119/api/status",{
          headers:token?{"Authorization":"Bearer "+token}:{},
          signal:controller.signal
        });
        clearTimeout(timer);
        if(r.ok){
          // 也检查网关是否可达
          try{
            var gwCtrl=new AbortController();
            var gwTimer=setTimeout(function(){gwCtrl.abort();},5000);
            var apiKey="";
            if(window.electronAPI&&window.electronAPI.getApiKey)apiKey=await window.electronAPI.getApiKey();
            var gwR=await fetch("http://127.0.0.1:8642/v1/models",{
              headers:apiKey?{"Authorization":"Bearer "+apiKey}:{},
              signal:gwCtrl.signal
            });
            clearTimeout(gwTimer);
            success=gwR.ok;
          }catch(gwE){
            success=true; // Dashboard OK, gateway might be starting
          }
          break;
        }
      }catch(e){
        if(attempt<maxRetries-1)await new Promise(function(r){setTimeout(r,RETRY_DELAY);});
      }
    }
    if(success&&!online){
      setOnline(true);
      window.dispatchEvent(new Event("hermes-reconnected"));
    }else if(success){
      setOnline(true);
    }else{
      failCount++;
      setOnline(false);
    }
    checking=false;
  }

  txt.onclick=async function(){
    setReconnecting();
    await checkConn();
    if(online)window.dispatchEvent(new Event("hermes-reconnected"));
  };

  gwBtn.onclick=async function(){
    gwBtn.textContent="...";gwBtn.disabled=true;
    try{
      if(window.electronAPI&&window.electronAPI.gatewayStart){
        var r=await window.electronAPI.gatewayStart();
        gwBtn.textContent=r.ok?"\u5df2\u542f\u52a8":"\u5931\u8d25";
      }else gwBtn.textContent="\u4e0d\u53ef\u7528";
    }catch(e){gwBtn.textContent="\u9519\u8bef";}
    setTimeout(function(){gwBtn.textContent="\u7f51\u5173";gwBtn.disabled=false;},2000);
  };

  function scheduleCheck(){
    var interval=online?ONLINE_INTERVAL:OFFLINE_INTERVAL;
    setTimeout(function(){
      checkConn().then(scheduleCheck);
    },interval);
  }

  checkConn().then(scheduleCheck);
  document.body.style.paddingTop="30px";
})()
