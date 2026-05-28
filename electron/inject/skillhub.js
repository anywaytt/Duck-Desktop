(function(){

  if(window.__SKILLHUB__)return;window.__SKILLHUB__=1;



    // 按钮由 unified-sidebar.js 统一管理



  var panel=document.createElement("div");

  panel.style.cssText="position:fixed;top:80px;left:64px;width:400px;max-height:80vh;background:rgba(26,20,8,0.98);border:1px solid #333;border-radius:12px;z-index:9998;font-family:Inter,system-ui,sans-serif;display:none;box-shadow:0 4px 24px rgba(0,0,0,0.6);overflow:hidden";

  document.body.appendChild(panel);



  var token="",skills=[];



  async function getToken(){try{if(window.electronAPI&&window.electronAPI.getSessionToken)token=await window.electronAPI.getSessionToken();}catch(e){}}

  async function api(p,o){var h={"Content-Type":"application/json"};if(token)h["Authorization"]="Bearer "+token;var r=await fetch("http://127.0.0.1:9119"+p,{...o,headers:{...h,...(o&&o.headers||{})}});if(!r.ok)throw new Error(r.status);return r.json();}



  async function load(){try{skills=await api("/api/skills");renderList();}catch(e){panel.innerHTML='<div style="padding:20px;color:#f44336;font-size:12px">'+e.message+'</div>';}}



  async function toggle(name,on){try{await api("/api/skills/toggle",{method:"PUT",body:JSON.stringify({name:name,enabled:on})});}catch(e){}}



  function renderList(){

    var cats={};

    skills.forEach(function(s){var c=s.category||"\u5176\u4ed6";if(!cats[c])cats[c]=[];cats[c].push(s);});

    var sorted=Object.keys(cats).sort(function(a,b){return cats[b].length-cats[a].length;});

    var totalOn=skills.filter(function(s){return s.enabled;}).length;



    var html='<div style="padding:14px 16px;border-bottom:1px solid #333;display:flex;justify-content:space-between;align-items:center">';

    html+='<div><span style="color:#f5a623;font-weight:600;font-size:13px">\u6280\u80fd\u5e02\u573a</span>';

    html+='<span style="color:#555;font-size:10px;margin-left:8px">'+totalOn+"/"+skills.length+" \u5df2\u542f\u7528</span></div>";

    html+='<div style="display:flex;gap:8px">';

    html+='<span style="color:#888;font-size:10px;cursor:pointer" id="sh-add">+ \u6dfb\u52a0</span>';

    html+='<span style="color:#666;font-size:10px;cursor:pointer" id="sh-close">\u5173\u95ed</span></div></div>';

    html+='<div style="max-height:70vh;overflow-y:auto">';



    var colors={creative:"#e8920d","software-development":"#4caf50",mlops:"#2196f3",productivity:"#9c27b0",github:"#8b949e",media:"#ff5722","autonomous-ai-agents":"#f5a623",devops:"#607d8b",research:"#00bcd4",gaming:"#e91e63",medical:"#f44336"};



    sorted.forEach(function(cat){

      var c=colors[cat]||"#888",count=cats[cat].length,onCount=cats[cat].filter(function(s){return s.enabled;}).length;

      var heat=count>=8?"\u{1F525}\u{1F525}\u{1F525}":count>=5?"\u{1F525}\u{1F525}":count>=3?"\u{1F525}":"";

      html+='<div><div class="cat-h" data-c="'+cat+'" style="padding:8px 16px;display:flex;justify-content:space-between;align-items:center;cursor:pointer">';

      html+='<div style="display:flex;align-items:center;gap:6px"><span style="color:'+c+';font-size:10px;font-weight:600;text-transform:uppercase">'+cat.replace(/-/g," ")+'</span>';

      html+='<span style="color:#555;font-size:9px">'+onCount+"/"+count+"</span>"+(heat?'<span style="font-size:10px">'+heat+"</span>":"")+'</div>';

      html+='<span style="color:#444;font-size:10px">\u25bc</span></div>';

      html+='<div class="cat-b" data-c="'+cat+'" style="display:none">';

      cats[cat].forEach(function(s){

        html+='<div class="sk-i" data-n="'+s.name+'" data-e="'+s.enabled+'" style="padding:6px 16px 6px 28px;display:flex;justify-content:space-between;align-items:center;cursor:pointer">';

        html+='<div style="flex:1;min-width:0"><div style="color:'+(s.enabled?"#ccc":"#666")+';font-size:11px">'+s.name+'</div>';

        html+='<div style="color:#555;font-size:9px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+(s.description||"").substring(0,60)+'</div></div>';

        html+='<span class="sk-t" style="font-size:14px;cursor:pointer;margin-left:8px">'+(s.enabled?"\u2705":"\u26aa")+'</span></div>';

      });

      html+='</div></div>';

    });

    html+='</div>';

    panel.innerHTML=html;



    panel.querySelectorAll(".cat-h").forEach(function(el){

      el.onclick=function(){var b=panel.querySelector('.cat-b[data-c="'+this.getAttribute("data-c")+'"]');b.style.display=b.style.display==="none"?"block":"none";};

    });

    panel.querySelectorAll(".sk-t").forEach(function(el){

      el.onclick=function(e){

        e.stopPropagation();

        var item=this.parentElement,n=item.getAttribute("data-n"),on=item.getAttribute("data-e")==="true";

        item.setAttribute("data-e",!on);this.textContent=on?"\u26aa":"\u2705";toggle(n,!on);

      };

    });

    panel.querySelectorAll(".sk-i").forEach(function(el){

      el.onclick=function(){var n=this.getAttribute("data-n");var sk=skills.find(function(s){return s.name===n;});if(sk)renderDetail(sk);};

    });

    document.getElementById("sh-add").onclick=function(){renderAdd();};

    document.getElementById("sh-close").onclick=function(){panel.style.display="none";};

  }



  function renderDetail(sk){

    var html='<div style="padding:10px 16px;border-bottom:1px solid #333;display:flex;justify-content:space-between">';

    html+='<span style="color:#888;font-size:11px;cursor:pointer" id="sh-back">\u2190 \u8fd4\u56de</span>';

    html+='<span style="color:#666;font-size:10px;cursor:pointer" id="sh-close2">\u5173\u95ed</span></div>';

    html+='<div style="padding:16px;max-height:70vh;overflow-y:auto">';

    html+='<div style="color:#f5a623;font-size:16px;font-weight:600;margin-bottom:4px">'+sk.name+'</div>';

    html+='<div style="color:#555;font-size:10px;margin-bottom:12px">'+(sk.category||"\u5176\u4ed6")+'</div>';

    html+='<div style="color:#aaa;font-size:12px;line-height:1.7;white-space:pre-wrap">'+(sk.description||"\u65e0\u63cf\u8ff0")+'</div>';

    html+='<div style="margin-top:16px;padding-top:12px;border-top:1px solid #222">';

    html+='<button id="sk-btn" style='+(sk.enabled?"background:#333;color:#aaa":"background:#f5a623;color:#1a1408")+';border:none;border-radius:6px;padding:8px 16px;font-size:12px;cursor:pointer;width:100%">'+(sk.enabled?"\u7981\u7528\u6280\u80fd":"\u542f\u7528\u6280\u80fd")+'</button></div></div>';

    panel.innerHTML=html;

    document.getElementById("sh-back").onclick=function(){renderList();};

    document.getElementById("sh-close2").onclick=function(){panel.style.display="none";};

    document.getElementById("sk-btn").onclick=function(){sk.enabled=!sk.enabled;toggle(sk.name,sk.enabled);renderDetail(sk);};

  }



  function renderAdd(){

    var html='<div style="padding:10px 16px;border-bottom:1px solid #333;display:flex;justify-content:space-between">';

    html+='<span style="color:#888;font-size:11px;cursor:pointer" id="sh-back">\u2190 \u8fd4\u56de</span>';

    html+='<span style="color:#666;font-size:10px;cursor:pointer" id="sh-close2">\u5173\u95ed</span></div>';

    html+='<div style="padding:16px;max-height:70vh;overflow-y:auto">';

    html+='<div style="color:#f5a623;font-size:14px;font-weight:600;margin-bottom:12px">\u6dfb\u52a0\u65b0\u6280\u80fd</div>';

    html+='<input id="sk-n" placeholder="\u6280\u80fd\u540d\u79f0" style="width:100%;background:#1a1408;border:1px solid #333;border-radius:6px;padding:8px 10px;color:#ccc;font-size:11px;margin-bottom:8px;outline:none;box-sizing:border-box">';

    html+='<input id="sk-c" placeholder="\u5206\u7c7b\uff08\u5982 productivity\uff09" style="width:100%;background:#1a1408;border:1px solid #333;border-radius:6px;padding:8px 10px;color:#ccc;font-size:11px;margin-bottom:8px;outline:none;box-sizing:border-box">';

    html+='<textarea id="sk-t" placeholder="# \u6280\u80fd\u540d\u79f0\n\n\u63cf\u8ff0..." style="width:100%;height:200px;background:#1a1408;border:1px solid #333;border-radius:6px;padding:10px;color:#ccc;font-size:11px;font-family:monospace;resize:vertical;outline:none;box-sizing:border-box"></textarea>';

    html+='<button id="sk-save" style="width:100%;background:#f5a623;color:#1a1408;border:none;border-radius:6px;padding:10px;font-size:12px;font-weight:600;cursor:pointer;margin-top:8px">\u521b\u5efa\u6280\u80fd</button>';

    html+='<div id="sk-msg" style="margin-top:8px;font-size:11px;display:none"></div></div>';

    panel.innerHTML=html;

    document.getElementById("sh-back").onclick=function(){renderList();};

    document.getElementById("sh-close2").onclick=function(){panel.style.display="none";};

    document.getElementById("sk-save").onclick=async function(){

      var n=document.getElementById("sk-n").value.trim(),c=document.getElementById("sk-c").value.trim()||"custom",t=document.getElementById("sk-t").value.trim(),msg=document.getElementById("sk-msg");

      if(!n||!t){msg.style.display="block";msg.style.color="#f44336";msg.textContent="\u8bf7\u586b\u5199\u540d\u79f0\u548c\u5185\u5bb9";return;}

      this.textContent="\u521b\u5efa\u4e2d...";this.disabled=true;

      try{

        if(window.electronAPI&&window.electronAPI.runHermesCmd){

          var r=await window.electronAPI.runHermesCmd(["skill","create","--name",n,"--category",c,"--content",t]);

          if(r.ok){msg.style.display="block";msg.style.color="#4caf50";msg.textContent="\u521b\u5efa\u6210\u529f\uff01";setTimeout(load,1500);}

          else{msg.style.display="block";msg.style.color="#f44336";msg.textContent="\u5931\u8d25: "+(r.stderr||"").substring(0,80);}

        }

      }catch(e){msg.style.display="block";msg.style.color="#f44336";msg.textContent="\u9519\u8bef: "+e.message;}

      this.textContent="\u521b\u5efa\u6280\u80fd";this.disabled=false;

    };

  }



  window.__DUCK_PANELS__=window.__DUCK_PANELS__||{};
  window.__DUCK_PANELS__.skills=function(){if(panel.style.display==="none"){panel.style.display="block";load();}else panel.style.display="none";};

  getToken();

})()