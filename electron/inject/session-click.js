(function(){
  if(window.__SESCLICK__)return;window.__SESCLICK__=1;

  // Rename "最近会话" to "聊天记录"
  var renameTimer=setInterval(function(){
    document.querySelectorAll("span,h3,p").forEach(function(el){
      if(el.childNodes.length===1&&el.textContent.trim()==="\u6700\u8fd1\u4f1a\u8bdd"){
        el.textContent="\u{1F4CB} \u804a\u5929\u8bb0\u5f55";
      }
    });
  },2000);

  // Only bind click to session items (specific class pattern)
  var boundTimer=setInterval(function(){
    // Session items have: bg-hermes-bg/30 border-hermes-border/10
    // and contain: flex items-center gap-3 px-3 py-2.5
    document.querySelectorAll(".rounded-lg.bg-hermes-bg\\/30").forEach(function(el){
      if(el.__sesBound)return;
      el.__sesBound=true;
      el.style.cursor="pointer";
      el.addEventListener("click",function(e){
        // Don't trigger if clicking a button or link inside
        if(e.target.tagName==="BUTTON"||e.target.tagName==="A"||e.target.closest("button")||e.target.closest("a"))return;
        // Get session title
        var titleEl=this.querySelector(".text-xs.font-medium, .truncate");
        var title=titleEl?titleEl.textContent.trim():"";
        window.__RESUME_TITLE__=title;
        if(window.electronAPI)window.electronAPI.openChat();
      });
    });
  },1500);
})()