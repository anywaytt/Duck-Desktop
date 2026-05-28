(function(){
  if(window.__GPUMON__)return;window.__GPUMON__=1;

  var panel=document.createElement("div");
  panel.style.cssText="position:fixed;bottom:80px;left:64px;width:280px;background:rgba(26,20,8,0.95);border:1px solid #333;border-radius:10px;padding:12px;z-index:9997;font-family:Inter,system-ui,sans-serif;display:none;box-shadow:0 4px 16px rgba(0,0,0,0.4)";
  document.body.appendChild(panel);

    // 按钮由 unified-sidebar.js 统一管理

  function refresh(){
    if(!window.electronAPI||!window.electronAPI.getGpuStats)return;
    window.electronAPI.getGpuStats().then(function(gpus){
      if(!gpus||gpus.length===0){
        panel.innerHTML='<div style="color:#555;font-size:10px">\u672a\u68c0\u6d4b\u5230 GPU</div>';
        return;
      }
      var h='<div style="color:#4fc3f7;font-size:11px;font-weight:600;margin-bottom:8px">\ud83c\udfa6 GPU \u76d1\u63a7</div>';
      gpus.forEach(function(g){
        var memPct=g.memTotal>0?Math.round(g.memUsed/g.memTotal*100):0;
        var tempColor=g.temp>=85?"#f44336":g.temp>=70?"#ffa726":"#4caf50";
        var utilColor=g.util>=90?"#f44336":g.util>=70?"#ffa726":"#4caf50";
        var memColor=memPct>=90?"#f44336":memPct>=70?"#ffa726":"#4caf50";

        h+='<div style="margin-bottom:10px;padding:8px;background:rgba(255,255,255,0.03);border-radius:6px;border:1px solid #222">';
        h+='<div style="color:#ccc;font-size:10px;margin-bottom:4px">GPU '+g.index+': '+g.name+'</div>';

        // 温度
        h+='<div style="display:flex;justify-content:space-between;font-size:9px;color:#888;margin-bottom:2px"><span>\u6e29\u5ea6</span><span style="color:'+tempColor+'">'+g.temp+'\u00b0C</span></div>';

        // GPU 利用率
        h+='<div style="display:flex;justify-content:space-between;font-size:9px;color:#888;margin-bottom:2px"><span>\u5229\u7528\u7387</span><span style="color:'+utilColor+'">'+g.util+'%</span></div>';
        h+='<div style="width:100%;height:3px;background:#222;border-radius:2px;margin-bottom:4px"><div style="width:'+g.util+'%;height:100%;background:'+utilColor+';border-radius:2px;transition:width 0.5s"></div></div>';

        // 显存
        h+='<div style="display:flex;justify-content:space-between;font-size:9px;color:#888;margin-bottom:2px"><span>\u663e\u5b58</span><span style="color:'+memColor+'">'+g.memUsed+'/'+g.memTotal+' MB ('+memPct+'%)</span></div>';
        h+='<div style="width:100%;height:3px;background:#222;border-radius:2px;margin-bottom:4px"><div style="width:'+memPct+'%;height:100%;background:'+memColor+';border-radius:2px;transition:width 0.5s"></div></div>';

        // 风扇和功耗
        if(g.fan>0||g.power>0){
          h+='<div style="display:flex;gap:12px;font-size:9px;color:#555">';
          if(g.fan>0)h+='<span>\ud83d\udca8 '+g.fan+'%</span>';
          if(g.power>0)h+='<span>\u26a1 '+g.power+'W</span>';
          h+='</div>';
        }
        h+='</div>';
      });
      panel.innerHTML=h;
    }).catch(function(){});
  }

  // 注册到侧边栏
  window.__DUCK_PANELS__=window.__DUCK_PANELS__||{};
  window.__DUCK_PANELS__.gpu=function(){
    if(panel.style.display==="none"){panel.style.display="block";refresh();}
    else panel.style.display="none";
  };

  setInterval(refresh, 5000);
})();