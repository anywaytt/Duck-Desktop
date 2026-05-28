(async function(){
  if(window.__GWSTATUS__)return;window.__GWSTATUS__=1;
  setTimeout(async function(){
    var bar=document.createElement("div");
    bar.style.cssText="position:fixed;top:0;left:0;right:0;height:26px;background:rgba(26,20,8,0.95);border-bottom:1px solid #333;display:flex;align-items:center;justify-content:center;gap:8px;z-index:99999;font-family:Inter,system-ui,sans-serif;font-size:11px;-webkit-app-region:drag";
    var dot=document.createElement("span");
    dot.style.cssText="width:7px;height:7px;border-radius:50%;display:inline-block;-webkit-app-region:no-drag";
    var txt=document.createElement("span");
    txt.style.cssText="color:#888;-webkit-app-region:no-drag;cursor:pointer";
    bar.appendChild(dot);bar.appendChild(txt);
    document.body.appendChild(bar);
    async function check(){
      try{
        var r=await window.electronAPI.gatewayStatus();
        if(r.running){dot.style.background="#4caf50";txt.textContent="Gateway Running";txt.style.color="#4caf50";}
        else{dot.style.background="#f44336";txt.textContent="Gateway Offline - Click to start";txt.style.color="#f44336";}
      }catch(e){dot.style.background="#666";txt.textContent="Gateway: Unknown";}
    }
    txt.onclick=async function(){
      txt.textContent="Starting...";dot.style.background="#ffa726";
      try{
        var r=await window.electronAPI.gatewayStart();
        if(r.success){dot.style.background="#4caf50";txt.textContent="Gateway Started!";setTimeout(check,2000);}
        else{dot.style.background="#f44336";txt.textContent="Start failed";}
      }catch(e){dot.style.background="#f44336";txt.textContent="Error";}
    };
    check();setInterval(check,30000);
  },1000);
})()