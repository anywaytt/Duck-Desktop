(function(){
  if(window.__KB__)return;window.__KB__=1;

  // 按钮由 unified-sidebar.js 统一管理

  var panel=document.createElement("div");
  panel.style.cssText="position:fixed;top:30px;right:0;width:380px;height:calc(100vh - 30px);background:rgba(26,20,8,0.98);border-left:1px solid #333;z-index:99998;font-family:Inter,system-ui,sans-serif;display:none;overflow-y:auto;box-shadow:-4px 0 16px rgba(0,0,0,0.3)";
  document.body.appendChild(panel);

  async function load(){
    var h='<div style="padding:16px;border-bottom:1px solid #333;display:flex;justify-content:space-between;align-items:center">';
    h+='<span style="color:#4fc3f7;font-weight:600;font-size:14px">\u{1F4DA} \u77e5\u8bc6\u5e93</span>';
    h+='<span style="color:#666;font-size:18px;cursor:pointer" id="kbClose">\u00d7</span></div>';
    h+='<div style="padding:16px">';

    // 统计
    try{
      var stats=await window.electronAPI.kbStats();
      h+='<div style="display:flex;gap:12px;margin-bottom:16px">';
      h+='<div style="flex:1;padding:10px;background:rgba(79,195,247,0.05);border:1px solid rgba(79,195,247,0.2);border-radius:8px;text-align:center">';
      h+='<div style="color:#4fc3f7;font-size:20px;font-weight:600">'+(stats.docs||0)+'</div>';
      h+='<div style="color:#888;font-size:9px">\u6587\u6863</div></div>';
      h+='<div style="flex:1;padding:10px;background:rgba(79,195,247,0.05);border:1px solid rgba(79,195,247,0.2);border-radius:8px;text-align:center">';
      h+='<div style="color:#4fc3f7;font-size:20px;font-weight:600">'+(stats.chunks||0)+'</div>';
      h+='<div style="color:#888;font-size:9px">\u7247\u6bb5</div></div>';
      h+='<div style="flex:1;padding:10px;background:rgba(79,195,247,0.05);border:1px solid rgba(79,195,247,0.2);border-radius:8px;text-align:center">';
      h+='<div style="color:#4fc3f7;font-size:20px;font-weight:600">'+Math.round((stats.index_size||0)/1024)+'K</div>';
      h+='<div style="color:#888;font-size:9px">\u7d22\u5f15</div></div>';
      h+='</div>';
    }catch(e){}

    // 导入按钮
    h+='<button id="kbImport" style="width:100%;background:rgba(79,195,247,0.1);color:#4fc3f7;border:1px solid #333;border-radius:8px;padding:10px;font-size:12px;cursor:pointer;margin-bottom:16px">';
    h+='+ \u5bfc\u5165\u6587\u6863\uff08PDF/TXT/MD/DOCX\uff09</button>';

    // 搜索框
    h+='<div style="margin-bottom:16px">';
    h+='<div style="display:flex;gap:6px"><input id="kbQuery" placeholder="\u641c\u7d22\u77e5\u8bc6\u5e93..." style="flex:1;background:#1a1408;border:1px solid #333;border-radius:6px;padding:6px 10px;color:#ccc;font-size:11px;outline:none">';
    h+='<button id="kbSearchBtn" style="background:#4fc3f7;color:#1a1408;border:none;border-radius:6px;padding:6px 12px;font-size:10px;cursor:pointer">\u641c\u7d22</button></div>';
    h+='<div id="kbResults" style="margin-top:8px"></div></div>';

    // 文档列表
    h+='<div style="color:#f5a623;font-size:11px;font-weight:600;margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid #222">\u5df2\u5bfc\u5165\u6587\u6863</div>';
    try{
      var list=await window.electronAPI.kbList();
      if(list.docs&&list.docs.length>0){
        list.docs.forEach(function(doc){
          h+='<div style="display:flex;justify-content:space-between;align-items:center;padding:8px;margin-bottom:4px;background:rgba(255,255,255,0.03);border-radius:6px;border:1px solid #222">';
          h+='<div><div style="color:#ccc;font-size:11px">'+doc.name+'</div>';
          h+='<div style="color:#555;font-size:9px">'+doc.chunks+' \u7247\u6bb5 \u00b7 '+Math.round(doc.size/1024)+'KB</div></div>';
          h+='<button data-remove="'+doc.id+'" style="background:none;color:#f44336;border:1px solid #333;border-radius:4px;padding:2px 8px;font-size:9px;cursor:pointer">\u5220\u9664</button></div>';
        });
      }else{
        h+='<div style="color:#555;font-size:11px;padding:12px 0;text-align:center">\u6682\u65e0\u6587\u6863\uff0c\u70b9\u51fb\u4e0a\u65b9\u5bfc\u5165</div>';
      }
    }catch(e){h+='<div style="color:#f44336;font-size:11px">\u52a0\u8f7d\u5931\u8d25</div>';}

    h+='</div>';
    panel.innerHTML=h;

    // 绑定事件
    document.getElementById("kbClose").onclick=function(){panel.style.display="none";};
    document.getElementById("kbImport").onclick=async function(){
      var btn=document.getElementById("kbImport");
      try{
        var files=await window.electronAPI.kbPickFile();
        if(!files||files.length===0)return;
        btn.textContent="\u5bfc\u5165\u4e2d...";btn.disabled=true;
        for(var i=0;i<files.length;i++){
          btn.textContent="\u5bfc\u5165 "+(i+1)+"/"+files.length+"...";
          var r=await window.electronAPI.kbAdd(files[i]);
          if(!r.ok)console.log("[KB] add error:",r.error);
        }
        btn.textContent="\u2713 \u5bfc\u5165\u5b8c\u6210";btn.style.background="rgba(76,175,80,0.1)";btn.style.color="#4caf50";
        setTimeout(function(){load();},1000);
      }catch(e){
        btn.textContent="\u2717 \u5931\u8d25";btn.style.background="rgba(244,67,54,0.1)";btn.style.color="#f44336";
      }
      setTimeout(function(){btn.textContent="+ \u5bfc\u5165\u6587\u6863";btn.style.background="";btn.style.color="";btn.disabled=false;},3000);
    };
    document.getElementById("kbSearchBtn").onclick=async function(){
      var q=document.getElementById("kbQuery").value.trim();
      if(!q)return;
      var r=await window.electronAPI.kbSearch(q,5);
      var el=document.getElementById("kbResults");
      if(r.results&&r.results.length>0){
        var html="";
        r.results.forEach(function(item){
          html+='<div style="padding:8px;margin-bottom:4px;background:rgba(79,195,247,0.05);border-radius:6px;border:1px solid #222">';
          html+='<div style="color:#4fc3f7;font-size:9px;margin-bottom:4px">'+item.source+' \u00b7 \u76f8\u5173\u5ea6: '+item.score+'</div>';
          html+='<div style="color:#aaa;font-size:10px;line-height:1.5">'+item.text.substring(0,200)+(item.text.length>200?"...":"")+'</div></div>';
        });
        el.innerHTML=html;
      }else{
        el.innerHTML='<div style="color:#555;font-size:10px;padding:8px 0">\u672a\u627e\u5230\u76f8\u5173\u5185\u5bb9</div>';
      }
    };
    document.getElementById("kbQuery").onkeydown=function(e){if(e.key==="Enter")document.getElementById("kbSearchBtn").click();};
    panel.querySelectorAll("[data-remove]").forEach(function(el){
      el.onclick=async function(){
        var docId=this.getAttribute("data-remove");
        await window.electronAPI.kbRemove(docId);
        load();
      };
    });
  }

  window.__DUCK_PANELS__=window.__DUCK_PANELS__||{};
  window.__DUCK_PANELS__.kb=function(){
    if(panel.style.display==="none"){panel.style.display="block";load();}
    else panel.style.display="none";
  };
  document.addEventListener("click",function(e){
    if(panel.style.display!=="none"&&!panel.contains(e.target))panel.style.display="none";
  });
})()