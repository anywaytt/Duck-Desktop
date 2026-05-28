(function(){
  if(window.__WECHAT__)return;window.__WECHAT__=1;

    // 按钮由 unified-sidebar.js 统一管理


  // 微信管理面板
  var panel=document.createElement("div");
  panel.style.cssText="position:fixed;top:30px;right:0;width:380px;height:calc(100vh - 30px);background:rgba(26,20,8,0.98);border-left:1px solid #333;z-index:99998;font-family:Inter,system-ui,sans-serif;display:none;overflow-y:auto;box-shadow:-4px 0 16px rgba(0,0,0,0.3)";
  document.body.appendChild(panel);

  var _token="",_sessions=[],_config={};

  async function getToken(){
    try{
      var r=await fetch("http://127.0.0.1:9119/");
      var h=await r.text();
      var m=h.match(/__HERMES_SESSION_TOKEN__\s*=\s*"([^"]+)"/);
      if(m)_token=m[1];
    }catch(e){}
    if(!_token&&window.electronAPI&&window.electronAPI.getSessionToken){
      try{_token=await window.electronAPI.getSessionToken();}catch(e){}
    }
  }

  async function api(path,opts){
    var h={"Content-Type":"application/json"};
    if(_token)h["Authorization"]="Bearer "+_token;
    var r=await fetch("http://127.0.0.1:9119"+path,{...opts,headers:{...h,...(opts&&opts.headers||{})}});
    if(!r.ok)throw new Error(r.status);
    return r.json();
  }

  async function load(){
    await getToken();
    try{
      // 获取会话列表
      var sData=await api("/api/sessions");
      _sessions=(sData.sessions||[]).filter(function(s){return s.source==="weixin";});
      // 获取配置
      var cData=await api("/api/status");
      _config=cData;
      render();
    }catch(e){
      panel.innerHTML='<div style="padding:16px;color:#f44336">\u52a0\u8f7d\u5931\u8d25: '+e.message+'</div>';
    }
  }

  function render(){
    var h='<div style="padding:16px;border-bottom:1px solid #333;display:flex;justify-content:space-between;align-items:center">';
    h+='<span style="color:#07c160;font-weight:600;font-size:14px">\u5fae\u4fe1\u7ba1\u7406</span>';
    h+='<span style="color:#666;font-size:18px;cursor:pointer" id="wxClose">\u00d7</span></div>';
    h+='<div style="padding:16px">';

    // 状态
    var wxStatus=_config.gateway_platforms?_config.gateway_platforms.weixin||{}:{};
    var isOnline=wxStatus.state==="connected";
    h+='<div style="margin-bottom:16px;padding:12px;background:rgba(7,193,96,0.05);border:1px solid rgba(7,193,96,0.2);border-radius:8px">';
    h+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">';
    h+='<div style="width:8px;height:8px;border-radius:50%;background:'+(isOnline?"#07c160":"#f44336")+'"></div>';
    h+='<span style="color:'+(isOnline?"#07c160":"#f44336")+';font-size:12px;font-weight:500">'+(isOnline?"\u5df2\u8fde\u63a5":"\u672a\u8fde\u63a5")+'</span></div>';
    if(wxStatus.error_message)h+='<div style="color:#f44336;font-size:10px">'+wxStatus.error_message+'</div>';
    h+='</div>';

    // 微信会话列表
    h+='<div style="margin-bottom:16px">';
    h+='<div style="color:#f5a623;font-size:11px;font-weight:600;margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid #222">\u5fae\u4fe1\u5bf9\u8bdd\u8bb0\u5f55 ('+_sessions.length+')</div>';
    if(_sessions.length===0){
      h+='<div style="color:#555;font-size:11px;padding:8px 0">\u6682\u65e0\u5fae\u4fe1\u5bf9\u8bdd</div>';
    }else{
      _sessions.forEach(function(s){
        h+='<div style="padding:8px;margin-bottom:6px;background:rgba(255,255,255,0.03);border-radius:6px;border:1px solid #222;cursor:pointer" data-sid="'+s.id+'">';
        h+='<div style="color:#ccc;font-size:11px">'+(s.title||"\u672a\u547d\u540d\u4f1a\u8bdd")+'</div>';
        h+='<div style="color:#555;font-size:9px;margin-top:2px">';
        h+=(s.message_count||0)+" \u6761\u6d88\u606f";
        if(s.user_id)h+=" \u00b7 "+s.user_id.split("@")[0].substring(0,8)+"***";
        h+='</div></div>';
      });
    }
    h+='</div>';

    // 微信设置
    h+='<div style="margin-bottom:16px">';
    h+='<div style="color:#f5a623;font-size:11px;font-weight:600;margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid #222">\u5fae\u4fe1\u8bbe\u7f6e</div>';

    // 切换 Bot
    h+='<div style="margin-bottom:10px">';
    h+='<div style="color:#888;font-size:10px;margin-bottom:4px">\u5f53\u524d Bot \u7c7b\u578b</div>';
    h+='<select id="wxMode" style="width:100%;background:#1a1408;border:1px solid #333;border-radius:6px;padding:6px 10px;color:#ccc;font-size:11px;outline:none">';
    h+='<option value="both">\u53cc\u5411\u6a21\u5f0f\uff08\u6536\u53d1\u90fd\u884c\uff09</option>';
    h+='<option value="receive">\u4ec5\u63a5\u6536\u6a21\u5f0f</option>';
    h+='<option value="send">\u4ec5\u53d1\u9001\u6a21\u5f0f</option>';
    h+='</select></div>';

    // 空闲重置时间
    h+='<div style="margin-bottom:10px">';
    h+='<div style="color:#888;font-size:10px;margin-bottom:4px">\u7a7a\u95f2\u91cd\u7f6e\u65f6\u95f4\uff08\u5206\u949f\uff09</div>';
    h+='<input id="wxIdle" type="number" value="1440" style="width:100%;background:#1a1408;border:1px solid #333;border-radius:6px;padding:6px 10px;color:#ccc;font-size:11px;outline:none">';
    h+='</div>';

    // 保存按钮
    h+='<button id="wxSave" style="width:100%;background:#07c160;color:#fff;border:none;border-radius:6px;padding:8px;font-size:12px;font-weight:600;cursor:pointer">\u4fdd\u5b58\u5fae\u4fe1\u8bbe\u7f6e</button>';
    h+='</div>';

    // Bot 切换
    h+='<div style="margin-bottom:16px">';
    h+='<div style="color:#f5a623;font-size:11px;font-weight:600;margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid #222">\u5feb\u6377\u64cd\u4f5c</div>';
    h+='<div style="display:flex;gap:6px;flex-wrap:wrap">';
    h+='<button id="wxRestart" style="background:rgba(245,166,35,0.1);color:#f5a623;border:1px solid #333;border-radius:6px;padding:6px 12px;font-size:10px;cursor:pointer">\u91cd\u542f\u5fae\u4fe1\u670d\u52a1</button>';
    h+='<button id="wxDisc" style="background:rgba(244,67,54,0.1);color:#f44336;border:1px solid #333;border-radius:6px;padding:6px 12px;font-size:10px;cursor:pointer">\u65ad\u5f00\u5fae\u4fe1</button>';
    h+='<button id="wxReconn" style="background:rgba(7,193,96,0.1);color:#07c160;border:1px solid #333;border-radius:6px;padding:6px 12px;font-size:10px;cursor:pointer">\u91cd\u65b0\u8fde\u63a5</button>';
    h+='</div></div>';

    h+='</div>';
    panel.innerHTML=h;

    // 绑定事件
    document.getElementById("wxClose").onclick=function(){panel.style.display="none";};
    document.getElementById("wxSave").onclick=async function(){
      var btn=document.getElementById("wxSave");
      btn.textContent="\u4fdd\u5b58\u4e2d...";btn.disabled=true;
      try{
        var mode=document.getElementById("wxMode").value;
        var idle=parseInt(document.getElementById("wxIdle").value)||1440;
        await window.electronAPI.runHermesCmd(["config","set","platforms.weixin.mode",mode]);
        await window.electronAPI.runHermesCmd(["config","set","platforms.weixin.idle_minutes",String(idle)]);
        await window.electronAPI.runHermesCmd(["gateway","restart"]);
        btn.textContent="\u2713 \u5df2\u4fdd\u5b58";btn.style.background="#07c160";
        setTimeout(function(){btn.textContent="\u4fdd\u5b58\u5fae\u4fe1\u8bbe\u7f6e";btn.style.background="#07c160";btn.disabled=false;},2000);
      }catch(e){
        btn.textContent="\u2717 \u5931\u8d25";btn.style.background="#f44336";
        setTimeout(function(){btn.textContent="\u4fdd\u5b58\u5fae\u4fe1\u8bbe\u7f6e";btn.style.background="#07c160";btn.disabled=false;},2000);
      }
    };
    document.getElementById("wxRestart").onclick=async function(){
      var btn=document.getElementById("wxRestart");btn.textContent="...";
      await window.electronAPI.runHermesCmd(["gateway","restart"]);
      btn.textContent="\u2713";setTimeout(function(){btn.textContent="\u91cd\u542f\u5fae\u4fe1\u670d\u52a1";},2000);
    };
    document.getElementById("wxDisc").onclick=async function(){
      var btn=document.getElementById("wxDisc");btn.textContent="...";
      await window.electronAPI.runHermesCmd(["config","set","platforms.weixin.enabled","false"]);
      await window.electronAPI.runHermesCmd(["gateway","restart"]);
      btn.textContent="\u2713 \u5df2\u65ad\u5f00";setTimeout(function(){btn.textContent="\u65ad\u5f00\u5fae\u4fe1";},2000);
    };
    document.getElementById("wxReconn").onclick=async function(){
      var btn=document.getElementById("wxReconn");btn.textContent="...";
      await window.electronAPI.runHermesCmd(["config","set","platforms.weixin.enabled","true"]);
      await window.electronAPI.runHermesCmd(["gateway","restart"]);
      btn.textContent="\u2713";setTimeout(function(){btn.textContent="\u91cd\u65b0\u8fde\u63a5";},2000);
    };

    // 会话点击 → 打开聊天窗口查看
    panel.querySelectorAll("[data-sid]").forEach(function(el){
      el.onclick=function(){
        var sid=this.getAttribute("data-sid");
        if(window.electronAPI&&window.electronAPI.openChat){
          window.electronAPI.openChat();
        }
      };
    });
  }

  window.__DUCK_PANELS__=window.__DUCK_PANELS__||{};
  window.__DUCK_PANELS__.wechat=function(){
    if(panel.style.display==="none"){panel.style.display="block";load();}
    else panel.style.display="none";
  };
  document.addEventListener("click",function(e){
    if(panel.style.display!=="none"&&!panel.contains(e.target))panel.style.display="none";
  });
})()