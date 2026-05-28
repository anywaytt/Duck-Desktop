(function(){
  if(window.__SESHIST__)return;window.__SESHIST__=1;

    // 按钮由 unified-sidebar.js 统一管理

  var panel=document.createElement("div");
  panel.style.cssText="position:fixed;top:80px;left:64px;width:420px;max-height:80vh;background:rgba(26,20,8,0.98);border:1px solid #333;border-radius:12px;z-index:9998;font-family:Inter,system-ui,sans-serif;display:none;box-shadow:0 4px 24px rgba(0,0,0,0.6);overflow:hidden";
  document.body.appendChild(panel);

  var token="";

  async function getToken(){
    try{if(window.electronAPI&&window.electronAPI.getSessionToken)token=await window.electronAPI.getSessionToken();}catch(e){}
  }

  async function api(path){
    var h={};if(token)h["Authorization"]="Bearer "+token;
    var r=await fetch("http://127.0.0.1:9119"+path,{headers:h});
    if(!r.ok)throw new Error(r.status);
    return r.json();
  }

  function fmtTime(ts){
    if(!ts)return"";var d=new Date(ts*1000);var now=new Date();var diff=(now-d)/1000;
    if(diff<60)return"Just now";if(diff<3600)return Math.floor(diff/60)+"m ago";
    if(diff<86400)return Math.floor(diff/3600)+"h ago";
    return d.toLocaleDateString("zh-CN",{month:"short",day:"numeric"});
  }

  function fmtMsgTime(ts){
    if(!ts)return"";var d=new Date(ts*1000);
    return d.toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit"});
  }

  async function loadList(){
    try{
      var data=await api("/api/sessions?limit=20&offset=0");
      var sessions=data.sessions||[];
      renderList(sessions);
    }catch(e){
      panel.innerHTML='<div style="padding:20px;color:#f44336;font-size:12px">Error: '+e.message+'</div>';
    }
  }

  function renderList(sessions){
    var html='<div style="padding:14px 16px;border-bottom:1px solid #333;display:flex;justify-content:space-between;align-items:center">';
    html+='<span style="color:#f5a623;font-weight:600;font-size:13px">Chat History</span>';
    html+='<span style="color:#666;font-size:10px;cursor:pointer" id="ses-close">Close</span></div>';
    html+='<div style="max-height:70vh;overflow-y:auto">';

    if(!sessions.length){html+='<div style="padding:20px;color:#666;font-size:12px;text-align:center">No sessions</div>';}

    sessions.forEach(function(s){
      var title=s.title||s.id||"Untitled";
      var model=s.model||"";
      var time=fmtTime(s.last_active);
      var count=s.message_count||0;
      html+='<div class="ses-item" data-id="'+s.id+'" style="padding:10px 16px;border-bottom:1px solid #1a1a1a;cursor:pointer;transition:background 0.15s">';
      html+='<div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:4px">';
      html+='<div style="color:#ccc;font-size:12px;font-weight:500;max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+title+'</div>';
      html+='<span style="color:#555;font-size:10px;flex-shrink:0;margin-left:8px">'+time+'</span></div>';
      html+='<div style="display:flex;gap:8px;align-items:center">';
      if(model)html+='<span style="color:#f5a623;font-size:9px;background:rgba(245,166,35,0.1);padding:1px 5px;border-radius:3px">'+model+'</span>';
      html+='<span style="color:#555;font-size:9px">'+count+' msgs</span>';
      html+='</div></div>';
    });
    html+='</div>';
    panel.innerHTML=html;

    document.getElementById("ses-close").onclick=function(){panel.style.display="none";};
    panel.querySelectorAll(".ses-item").forEach(function(el){
      el.onmouseover=function(){this.style.background="rgba(245,166,35,0.05)";};
      el.onmouseout=function(){this.style.background="transparent";};
      el.onclick=function(){loadDetail(this.getAttribute("data-id"));};
    });
  }

  async function loadDetail(id){
    panel.innerHTML='<div style="padding:20px;color:#888;font-size:12px;text-align:center">Loading...</div>';
    try{
      var data=await api("/api/sessions/"+id+"/messages");
      renderDetail(id,data.messages||[]);
    }catch(e){
      panel.innerHTML='<div style="padding:20px;color:#f44336;font-size:12px">Error: '+e.message+'</div>';
    }
  }

  function renderDetail(id,messages){
    // Filter: only show user and assistant messages with content
    var filtered=[];
    messages.forEach(function(m){
      var role=m.role||"";
      var content=m.content||"";
      // Skip tool messages and empty assistant messages
      if(role==="tool")return;
      if(role==="assistant"&&!content)return;
      // Skip system messages
      if(role==="system")return;
      // Content might be array (multimodal)
      if(typeof content==="object"){
        if(Array.isArray(content)){
          content=content.map(function(c){
            if(typeof c==="string")return c;
            if(c.type==="text")return c.text||"";
            if(c.type==="image_url")return"[Image]";
            return"["+c.type+"]";
          }).join("\n");
        }else{
          content=JSON.stringify(content).substring(0,200);
        }
      }
      if(!content)return;
      filtered.push({role:role,content:content,timestamp:m.timestamp});
    });

    var html='<div style="padding:10px 16px;border-bottom:1px solid #333;display:flex;justify-content:space-between;align-items:center">';
    html+='<span style="color:#888;font-size:11px;cursor:pointer" id="ses-back">\u2190 Back</span>';
    html+='<span style="color:#f5a623;font-size:11px">'+filtered.length+' messages</span>';
    html+='<span style="color:#666;font-size:10px;cursor:pointer" id="ses-close2">Close</span></div>';
    html+='<div style="max-height:70vh;overflow-y:auto;padding:12px">';

    filtered.forEach(function(m){
      var isUser=m.role==="user";
      var bg=isUser?"rgba(245,166,35,0.08)":"rgba(255,255,255,0.03)";
      var color=isUser?"#f5a623":"#ccc";
      var label=isUser?"You":"Hermes";
      var time=fmtMsgTime(m.timestamp);
      var text=m.content;
      if(text.length>800)text=text.substring(0,800)+"...";

      html+='<div style="margin-bottom:10px;padding:10px 12px;background:'+bg+';border-radius:8px">';
      html+='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">';
      html+='<span style="color:'+color+';font-size:10px;font-weight:600">'+label+'</span>';
      if(time)html+='<span style="color:#444;font-size:9px">'+time+'</span>';
      html+='</div>';
      html+='<div style="color:#aaa;font-size:11px;line-height:1.6;white-space:pre-wrap;word-break:break-word">'+text.replace(/</g,"&lt;")+'</div>';
      html+='</div>';
    });

    if(!filtered.length){html+='<div style="padding:20px;color:#666;font-size:12px;text-align:center">No messages</div>';}
    html+='</div>';
    panel.innerHTML=html;

    document.getElementById("ses-back").onclick=function(){loadList();};
    document.getElementById("ses-close2").onclick=function(){panel.style.display="none";};
  }

  window.__DUCK_PANELS__=window.__DUCK_PANELS__||{};
  window.__DUCK_PANELS__.history=function(){
    if(panel.style.display==="none"){panel.style.display="block";loadList();}
    else{panel.style.display="none";}
  };

  getToken();
})()