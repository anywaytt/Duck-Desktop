(function(){
  if(window.__SETTINGS__)return;window.__SETTINGS__=1;

  // 按钮由 unified-sidebar.js 统一管理

  // 设置面板
  var panel=document.createElement("div");
  panel.style.cssText="position:fixed;top:30px;right:0;width:340px;height:calc(100vh - 30px);background:rgba(26,20,8,0.98);border-left:1px solid #333;z-index:99998;font-family:Inter,system-ui,sans-serif;display:none;overflow-y:auto;box-shadow:-4px 0 16px rgba(0,0,0,0.3)";
  document.body.appendChild(panel);

  var currentModel="",currentProvider="";

  function render(){
    var h='<div style="padding:16px;border-bottom:1px solid #333;display:flex;justify-content:space-between;align-items:center">';
    h+='<span style="color:#f5a623;font-weight:600;font-size:14px">\u2699 \u8bbe\u7f6e</span>';
    h+='<span style="color:#666;font-size:18px;cursor:pointer" id="setClose">\u00d7</span></div>';
    h+='<div style="padding:16px">';

    // 当前状态
    h+=section("\u5f53\u524d\u72b6\u6001",[
      row("\u6a21\u578b",currentModel||"\u672a\u77e5",true),
      row("\u63d0\u4f9b\u5546",currentProvider||"\u672a\u77e5",true)
    ]);

    // 网关管理
    h+=section("\u7f51\u5173\u7ba1\u7406",[
      btn_row("restartGw","\u91cd\u542f Gateway","\u91cd\u542f",function(el){
        el.textContent="...";el.disabled=true;
        window.electronAPI.runHermesCmd(["gateway","restart"]).then(function(r){
          el.textContent=r.ok?"\u2713 \u5df2\u91cd\u542f":"\u2717 \u5931\u8d25";
          setTimeout(function(){el.textContent="\u91cd\u542f";el.disabled=false;},2000);
        });
      }),
      btn_row("startGw","\u542f\u52a8 Gateway","\u542f\u52a8",function(el){
        el.textContent="...";el.disabled=true;
        window.electronAPI.runHermesCmd(["gateway","start"]).then(function(r){
          el.textContent=r.ok?"\u2713":"\u2717";
          setTimeout(function(){el.textContent="\u542f\u52a8";el.disabled=false;},2000);
        });
      })
    ]);

    // 聊天管理
    h+=section("\u804a\u5928\u7ba1\u7406",[
      btn_row("clearChat","\u6e05\u9664\u6240\u6709\u804a\u5928\u8bb0\u5f55\u548c\u8bb0\u5fc6","\u6e05\u9664",function(el){
        try{localStorage.removeItem("duck_sessions");localStorage.removeItem("duck_memory");localStorage.removeItem("duck_chat_history");}catch(e){}
        el.textContent="\u2713 \u5df2\u6e05\u9664";el.style.background="#4caf50";
        setTimeout(function(){el.textContent="\u6e05\u9664";el.style.background="";},2000);
      })
    ]);

    // 初始化
    h+=section("\u7cfb\u7edf\u521d\u59cb\u5316",[
      btn_row("resetAll","\u6062\u590d\u9ed8\u8ba4\u8bbe\u7f6e\uff0c\u6e05\u9664\u6240\u6709\u6570\u636e\uff0c\u91cd\u542f\u7f51\u5173","\u521d\u59cb\u5316",function(el){
        el.textContent="...";el.disabled=true;el.style.background="#f44336";
        // 清除所有本地数据
        try{
          localStorage.removeItem("duck_sessions");
          localStorage.removeItem("duck_memory");
          localStorage.removeItem("duck_chat_history");
          localStorage.removeItem("duck_config");
        }catch(e){}
        // 重启 gateway
        window.electronAPI.runHermesCmd(["gateway","restart"]).then(function(){
          el.textContent="\u2713 \u5df2\u521d\u59cb\u5316\uff0c\u8bf7\u91cd\u542f\u8f6f\u4ef6";
          el.style.background="#4caf50";
        }).catch(function(){
          el.textContent="\u2717 \u5931\u8d25\uff0c\u8bf7\u624b\u52a8\u91cd\u542f";
          el.style.background="#f44336";
        });
      })
    ]);

    // 关于
    h+=section("\u5173\u4e8e",[
      row("\u7248\u672c","Duck Desktop v1.0.0",true),
      row("\u6846\u67b6","Hermes Agent + Electron 28",true),
      row("\u81f4\u8c22","\u611f\u8c22\u96f7\u603b\u63a8\u51fa\u7684\u5c0f\u7c73\u6a21\u578b\u6fc0\u52b1\u8ba1\u5212\uff0c\u8d60\u9001\u768416\u4ebf token plan",true)
    ]);

    h+='</div>';
    panel.innerHTML=h;

    // 绑定事件
    document.getElementById("setClose").onclick=function(){panel.style.display="none";};
    panel.querySelectorAll("[data-action]").forEach(function(el){
      el.onclick=function(){var fn=el.getAttribute("data-action");if(handlers[fn])handlers[fn](el);};
    });
  }

  var handlers={
    restartGw:function(){},
    startGw:function(){},
    clearChat:function(){},
    resetAll:function(){}
  };

  function section(title,rows){
    var h='<div style="margin-bottom:16px">';
    h+='<div style="color:#f5a623;font-size:11px;font-weight:600;margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid #222">'+title+'</div>';
    rows.forEach(function(r){h+=r;});
    h+='</div>';
    return h;
  }
  function row(label,value,readonly){
    return '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;font-size:11px"><span style="color:#888">'+label+'</span><span style="color:'+(readonly?"#ccc":"#f5a623")+';max-width:180px;text-align:right;word-break:break-all">'+value+'</span></div>';
  }
  function btn_row(action,label,btnText,handler){
    handlers[action]=handler;
    return '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;font-size:11px"><span style="color:#888">'+label+'</span><button data-action="'+action+'" style="background:rgba(245,166,35,0.1);color:#f5a623;border:1px solid #333;border-radius:6px;padding:3px 10px;font-size:10px;cursor:pointer">'+btnText+'</button></div>';
  }

  async function loadInfo(){
    try{
      if(window.electronAPI&&window.electronAPI.getSessionToken){
        var token=await window.electronAPI.getSessionToken();
        var r=await fetch("http://127.0.0.1:9119/api/model/info",{headers:{"Authorization":"Bearer "+token}});
        if(r.ok){
          var info=await r.json();
          currentModel=info.model||"";
          currentProvider=info.provider||"";
        }
      }
    }catch(e){}
    render();
  }

  // 注册到侧边栏
  window.__DUCK_PANELS__=window.__DUCK_PANELS__||{};
  window.__DUCK_PANELS__.settings=function(){
    if(panel.style.display==="none"){
      panel.style.display="block";
      loadInfo();
    }else{
      panel.style.display="none";
    }
  };

  // 点击外部关闭
  document.addEventListener("click",function(e){
    if(panel.style.display!=="none"&&!panel.contains(e.target))panel.style.display="none";
  });
})()