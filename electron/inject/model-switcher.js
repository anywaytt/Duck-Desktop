(function(){
  if(window.__MODELSW__)return;window.__MODELSW__=1;

    // 按钮由 unified-sidebar.js 统一管理

  var panel=document.createElement("div");
  panel.style.cssText="position:fixed;top:30px;left:64px;width:420px;max-height:calc(100vh - 30px);background:rgba(26,20,8,0.98);border:1px solid #333;border-radius:12px;z-index:9998;font-family:Inter,system-ui,sans-serif;display:none;box-shadow:0 4px 24px rgba(0,0,0,0.6);overflow:hidden";
  document.body.appendChild(panel);

  var token="",currentModel="",currentProvider="",providers=[];

  var PRESETS=[{"name": "DeepSeek", "slug": "custom:deepseek", "desc": "V4系列 · 代码推理强", "tags": ["代码", "推理"], "base_url": "https://api.deepseek.com/v1", "needKey": true, "models": [{"m": "deepseek-v4-pro", "d": "V4 Pro · 最强 · 1M"}, {"m": "deepseek-v4-flash", "d": "V4 Flash · 快速 · 1M"}]}, {"name": "Qwen 通义千问", "slug": "custom:qwen", "desc": "阿里云 · 全模态", "tags": ["中文", "长文本", "工具"], "base_url": "https://dashscope.aliyuncs.com/compatible-mode/v1", "needKey": true, "models": [{"m": "qwen-max", "d": "Max · 最强"}, {"m": "qwen-plus", "d": "Plus · 均衡"}, {"m": "qwen3.6-plus", "d": "3.6 Plus · 视觉推理"}, {"m": "qwen-turbo", "d": "Turbo · 快速"}, {"m": "qwq-plus", "d": "QwQ · 深度推理"}]}, {"name": "Zhipu 智谱", "slug": "custom:zhipu", "desc": "清华系 · GLM-5", "tags": ["多模态", "Agent"], "base_url": "https://open.bigmodel.cn/api/paas/v4", "needKey": true, "models": [{"m": "GLM-5.1", "d": "5.1 · 最新旗舰"}, {"m": "GLM-5", "d": "5 · 高智能"}, {"m": "GLM-4.7", "d": "4.7 · 通用"}, {"m": "GLM-4.7-Flash", "d": "4.7 Flash · 免费"}]}, {"name": "Kimi 月之暗面", "slug": "custom:kimi", "desc": "K2.6 · 长文本之王", "tags": ["长文本", "256K", "Agent"], "base_url": "https://api.moonshot.cn/v1", "needKey": true, "models": [{"m": "kimi-k2.6", "d": "K2.6 · 最新最强"}, {"m": "kimi-k2.5", "d": "K2.5 · 多模态"}, {"m": "kimi-k2-turbo-preview", "d": "K2 Turbo · 高速"}, {"m": "kimi-k2-thinking", "d": "K2 · 深度思考"}]}, {"name": "Ollama 本地", "slug": "custom:Ollama", "desc": "本地运行 · 免费", "tags": ["免费", "隐私"], "base_url": "http://localhost:11434/v1", "needKey": false, "models": [{"m": "qwen3.6:27b", "d": "已安装"}, {"m": "qwen3.5:latest", "d": "已安装"}, {"m": "gemma4:31b", "d": "已安装"}, {"m": "qwen3:32b", "d": "Qwen3 32B"}, {"m": "qwen3-coder:32b", "d": "Qwen3 Coder"}, {"m": "deepseek-r1:32b", "d": "DeepSeek R1"}, {"m": "gemma3:27b", "d": "Gemma3 27B"}, {"m": "llama3.3:70b", "d": "Llama 3.3 70B"}, {"m": "mistral-large:latest", "d": "Mistral Large"}, {"m": "phi4:14b", "d": "Phi-4 14B"}, {"m": "codellama:34b", "d": "Code Llama 34B"}]}, {"name": "OpenRouter", "slug": "openrouter", "desc": "100+模型 · 海外", "tags": ["多模型", "按量"], "base_url": "https://openrouter.ai/api/v1", "needKey": true, "models": [{"m": "anthropic/claude-sonnet-4", "d": "Claude Sonnet 4"}, {"m": "google/gemini-2.5-pro", "d": "Gemini 2.5 Pro"}, {"m": "meta-llama/llama-4-maverick", "d": "Llama 4 Maverick"}]}, {"name": "Xiaomi MiMo", "slug": "xiaomi", "desc": "小米大模型 · 免费", "tags": ["免费", "中文"], "base_url": "", "needKey": false, "models": [{"m": "mimo-v2.5-pro", "d": "V2.5 Pro · 1T"}, {"m": "mimo-v2.5", "d": "V2.5 · 310B"}, {"m": "mimo-v2-pro", "d": "V2 Pro"}, {"m": "mimo-v2-omni", "d": "V2 Omni · 多模态"}]}];

  async function getToken(){
    try{if(window.electronAPI&&window.electronAPI.getSessionToken)token=await window.electronAPI.getSessionToken();}catch(e){}
    if(!token){try{var r=await fetch("http://127.0.0.1:9119/");var h=await r.text();var m=h.match(/__HERMES_SESSION_TOKEN__\s*=\s*"([^"]+)"/);if(m)token=m[1];}catch(e2){}}
  }
  async function api(p,o){var h={"Content-Type":"application/json"};if(token)h["Authorization"]="Bearer "+token;var r=await fetch("http://127.0.0.1:9119"+p,{...o,headers:{...h,...(o&&o.headers||{})}});if(!r.ok)throw new Error(r.status);return r.json();}

  var _modelsCache=null,_modelsCacheTime=0;
  async function refreshModels(){
    // 30分钟缓存
    if(_modelsCache&&Date.now()-_modelsCacheTime<1800000){return;}
    try{
      if(window.electronAPI&&window.electronAPI.fetchModels){
        // 5秒超时
        var live=await Promise.race([
          window.electronAPI.fetchModels(),
          new Promise(function(r){setTimeout(function(){r(null);},5000);})
        ]);
        if(live){
          // 更新 Ollama 模型列表
          var ollamaPreset=PRESETS.find(function(p){return p.slug==="custom:Ollama";});
          if(ollamaPreset&&live.ollama&&live.ollama.length>0){
            var existOllama=ollamaPreset.models.map(function(x){return x.m;});
            live.ollama.forEach(function(m){if(existOllama.indexOf(m)<0)ollamaPreset.models.push({m:m,d:m});});
          }
          // 更新 DeepSeek 模型列表（保留预设，补充 API 新模型）
          var dsPreset=PRESETS.find(function(p){return p.slug==="custom:deepseek";});
          if(dsPreset&&live.deepseek&&live.deepseek.length>0){
            var existIds=dsPreset.models.map(function(x){return x.m;});
            live.deepseek.forEach(function(m){if(existIds.indexOf(m)<0)dsPreset.models.push({m:m,d:m});});
          }
          // 更新 Qwen
          var qPreset=PRESETS.find(function(p){return p.slug==="custom:qwen";});
          if(qPreset&&live.qwen&&live.qwen.length>0){
            var existN=qPreset.models.map(function(x){return x.m;});
            live.qwen.filter(function(m){return !m.startsWith("ft:");}).forEach(function(m){if(existN.indexOf(m)<0)qPreset.models.push({m:m,d:m});});
          }
          // 更新 Zhipu
          var zPreset=PRESETS.find(function(p){return p.slug==="custom:zhipu";});
          if(zPreset&&live.zhipu&&live.zhipu.length>0){
            var existN2=zPreset.models.map(function(x){return x.m;});
            live.zhipu.forEach(function(m){if(existN2.indexOf(m)<0)zPreset.models.push({m:m,d:m});});
          }
          // 更新 Kimi
          var kPreset=PRESETS.find(function(p){return p.slug==="custom:kimi";});
          if(kPreset&&live.kimi&&live.kimi.length>0){
            var existN2=kPreset.models.map(function(x){return x.m;});
            live.kimi.forEach(function(m){if(existN2.indexOf(m)<0)kPreset.models.push({m:m,d:m});});
          }
        }
      }
      _modelsCache=true;_modelsCacheTime=Date.now();
    }catch(e){console.log("[models] refresh error:",e);}
  }
  async function load(){
    try{
      await getToken();
      // 先用缓存渲染（立即显示）
      try{var info=await api("/api/model/info");currentModel=info.model||"";currentProvider=info.provider||"";}catch(e){}
      try{var opts=await api("/api/model/options");providers=opts.providers||[];}catch(e){}
      render();
      // 后台异步刷新模型列表（不阻塞 UI）
      refreshModels().then(function(){render();}).catch(function(){});
    }catch(e){render();}
  }

  function render(){
    var html='<div style="padding:14px 16px;border-bottom:1px solid #333;display:flex;justify-content:space-between;align-items:center;flex-shrink:0">';
    html+='<span style="color:#f5a623;font-weight:600;font-size:13px">\u6a21\u578b\u5207\u6362</span>';
    html+='<span style="color:#666;font-size:10px;cursor:pointer" onclick="this.closest(\'div\').parentNode.style.display=\'none\'">\u5173\u95ed</span></div>';
    // Current
    html+='<div style="padding:10px 16px;border-bottom:1px solid #222;background:rgba(245,166,35,0.05);flex-shrink:0">';
    html+='<div style="color:#888;font-size:10px;margin-bottom:4px">\u5f53\u524d\u6a21\u578b</div>';
    html+='<div style="color:#f5a623;font-size:13px;font-weight:500">'+(currentModel||"\u672a\u77e5")+'</div>';
    html+='<div style="color:#666;font-size:10px">'+currentProvider+'</div></div>';
    // Scrollable presets area
    html+='<div style="flex:1;overflow-y:auto;min-height:0">';
    // Existing providers
    if(providers.length>0){
      html+='<div style="padding:8px 16px 4px;color:#555;font-size:9px;text-transform:uppercase">\u5df2\u6dfb\u52a0</div>';
      providers.forEach(function(p){
        var isC=p.is_current;
        html+='<div style="padding:6px 16px;border-bottom:1px solid #1a1a1a;background:'+(isC?"rgba(245,166,35,0.08)":"transparent")+'">';
        html+='<div style="display:flex;justify-content:space-between;align-items:center">';
        html+='<span style="color:'+(isC?"#f5a623":"#ccc")+';font-size:11px;font-weight:500">'+p.name+'</span>';
        if(p.source)html+='<span style="color:#555;font-size:8px;background:#1a1a1a;padding:1px 5px;border-radius:3px">'+p.source+'</span>';
        html+='</div>';
        (p.models||[]).forEach(function(m){
          var mC=isC&&m===currentModel;
          html+='<div style="padding:2px 0;font-size:10px;'+(mC?"color:#f5a623;font-weight:500":"color:#888;cursor:pointer")+'" data-p="'+p.slug+'" data-m="'+m+'">';
          html+=(mC?"\u25b6 ":"")+m+'</div>';
        });
        html+='</div>';
      });
    }
    // Presets
    html+='<div style="padding:8px 16px 4px;color:#f5a623;font-size:9px;font-weight:500">\u2b50 \u63a8\u8350\u6a21\u578b</div>';
    PRESETS.forEach(function(p,i){
      html+='<div style="padding:8px 16px;border-bottom:1px solid #1a1a1a">';
      html+='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px">';
      html+='<span style="color:#ccc;font-size:11px;font-weight:500">'+p.name+'</span>';
      html+='<span style="color:#555;font-size:9px">'+p.desc+'</span></div>';
      html+='<div style="display:flex;gap:3px;flex-wrap:wrap;margin-bottom:4px">';
      p.tags.forEach(function(t){html+='<span style="font-size:8px;color:#f5a623;background:rgba(245,166,35,0.1);padding:1px 4px;border-radius:3px">'+t+'</span>';});
      html+='</div><div style="display:flex;gap:4px;flex-wrap:wrap">';
      p.models.forEach(function(m){
        html+='<button data-pi="'+i+'" data-m="'+m.m+'" style="background:#1a1408;color:#888;border:1px solid #333;border-radius:6px;padding:3px 8px;font-size:10px;cursor:pointer;transition:all 0.15s" onmouseover="this.style.borderColor=\'#f5a623\';this.style.color=\'#f5a623\'" onmouseout="this.style.borderColor=\'#333\';this.style.color=\'#888\'">';
        html+=m.m+' <span style="color:#555;font-size:8px">'+m.d+'</span></button>';
      });
      html+='</div></div>';
    });
    html+='</div>';
    // Custom add - fixed at bottom
    html+='<div style="padding:10px 16px;border-top:1px solid #333;flex-shrink:0">';
    html+='<div style="color:#888;font-size:9px;margin-bottom:4px">\u624b\u52a8\u6dfb\u52a0</div>';
    html+='<div style="display:flex;gap:4px;margin-bottom:4px"><input id="ms_u" placeholder="API \u5730\u5740" style="flex:1;min-width:0;background:#1a1408;border:1px solid #333;border-radius:6px;padding:5px 8px;color:#ccc;font-size:10px;outline:none"><input id="ms_k" placeholder="Key (\u672c\u5730\u53ef\u7a7a)" type="password" style="flex:1;min-width:0;background:#1a1408;border:1px solid #333;border-radius:6px;padding:5px 8px;color:#ccc;font-size:10px;outline:none"></div>';
    html+='<div style="display:flex;gap:4px"><input id="ms_m" placeholder="\u6a21\u578b\u540d" style="flex:1;min-width:0;background:#1a1408;border:1px solid #333;border-radius:6px;padding:5px 8px;color:#ccc;font-size:10px;outline:none"><button id="ms_add" style="background:#f5a623;color:#1a1408;border:none;border-radius:6px;padding:5px 12px;font-size:10px;font-weight:600;cursor:pointer;white-space:nowrap">\u6dfb\u52a0</button></div>';
    html+='</div>';
    panel.innerHTML=html;
    bindAll();
  }

  function bindAll(){
    // Existing provider models
    panel.querySelectorAll("[data-p][data-m]:not([data-pi])").forEach(function(el){
      el.onclick=async function(){
        var prov=this.getAttribute("data-p"),model=this.getAttribute("data-m");
        var btn=this;
        btn.style.color="#ffa726";btn.textContent="切换中...";
        
        // 添加切换状态提示
        var statusDiv=document.createElement("div");
        statusDiv.style.cssText="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.8);color:white;padding:20px;border-radius:10px;z-index:10000;font-size:14px;";
        statusDiv.textContent="正在切换到 "+model+"...";
        document.body.appendChild(statusDiv);
        
        try{
          // 步骤1：设置Provider
          statusDiv.textContent="正在设置Provider...";
          var providerResult=await window.electronAPI.runHermesCmd(["config","set","provider",prov]);
          if(!providerResult.ok){
            throw new Error("Provider设置失败: "+providerResult.stderr);
          }
          
          // 步骤2：设置Model
          statusDiv.textContent="正在设置Model...";
          var modelResult=await window.electronAPI.runHermesCmd(["config","set","model",model]);
          if(!modelResult.ok){
            throw new Error("Model设置失败: "+modelResult.stderr);
          }
          
          // 步骤3：重启网关
          statusDiv.textContent="正在重启网关...";
          var restartResult=await window.electronAPI.runHermesCmd(["gateway","restart"]);
          if(!restartResult.ok){
            throw new Error("网关重启失败: "+restartResult.stderr);
          }
          
          // 步骤4：等待网关启动
          statusDiv.textContent="正在等待网关启动...";
          await new Promise(function(resolve){setTimeout(resolve,2000);});
          
          // 成功
          currentModel=model;currentProvider=prov;
          btn.style.color="#66bb6a";btn.textContent="✓ 已切换";
          statusDiv.textContent="切换成功！";
          statusDiv.style.background="rgba(0,128,0,0.8)";
          
          if(window.electronAPI.notifyModelSwitched)window.electronAPI.notifyModelSwitched();
          
          setTimeout(function(){
            document.body.removeChild(statusDiv);
            load();
          },1500);
          
        }catch(e){
          btn.style.color="#ef5350";btn.textContent="切换失败";
          statusDiv.textContent="切换失败: "+e.message;
          statusDiv.style.background="rgba(255,0,0,0.8)";
          
          setTimeout(function(){
            btn.style.color="";btn.textContent=model;
            document.body.removeChild(statusDiv);
          },3000);
        }
      };
    });
    // Preset models
    panel.querySelectorAll("[data-pi]").forEach(function(el){
      el.onclick=async function(){
        var pi=parseInt(this.getAttribute("data-pi"));
        var preset=PRESETS[pi];
        var model=this.getAttribute("data-m");
        this.style.color="#ffa726";this.textContent="...";
        try{
          // Ollama: 检查本地是否已安装，未安装则自动拉取（带进度条）
          if(preset.slug==="custom:Ollama"&&window.electronAPI&&window.electronAPI.ollamaList){
            var local=await window.electronAPI.ollamaList();
            var installed=local&&local.indexOf(model)>=0;
            if(!installed){
              var btn=this;
              btn.textContent="\u23f3 \u51c6\u5907\u4e0b\u8f7d...";
              btn.style.color="#ffa726";
              // 创建进度条
              var progWrap=document.createElement("div");
              progWrap.style.cssText="margin-top:4px;background:#1a1408;border:1px solid #333;border-radius:4px;overflow:hidden;height:6px;width:100%";
              var progBar=document.createElement("div");
              progBar.style.cssText="height:100%;background:linear-gradient(90deg,#f5a623,#ff6b35);width:0%;transition:width 0.3s;border-radius:4px";
              progWrap.appendChild(progBar);
              var progText=document.createElement("div");
              progText.style.cssText="font-size:9px;color:#888;margin-top:2px";
              progText.textContent="\u8fde\u63a5Ollama...";
              btn.parentElement.appendChild(progWrap);
              btn.parentElement.appendChild(progText);
              // 监听进度事件
              if(window.electronAPI.onOllamaPullProgress){
                window.electronAPI.onOllamaPullProgress(function(info){
                  if(info.percent!==undefined){
                    progBar.style.width=info.percent+"%";
                    progText.textContent=info.status+" "+info.percent+"%";
                    btn.textContent="\ud83d\udce5 \u4e0b\u8f7d\u4e2d "+info.percent+"%";
                  }else{
                    progText.textContent=info.status||"\u5904\u7406\u4e2d...";
                  }
                });
              }
              var pullR=await window.electronAPI.ollamaPull(model);
              if(!pullR||!pullR.ok){
                btn.textContent="\u2717 \u4e0b\u8f7d\u5931\u8d25";btn.style.color="#f44336";
                progText.textContent=(pullR&&pullR.output)||"\u4e0b\u8f7d\u5931\u8d25";
                progBar.style.background="#f44336";
                setTimeout(function(){btn.textContent=model;btn.style.color="#888";progWrap.remove();progText.remove();},5000);
                return;
              }
              progBar.style.width="100%";
              progBar.style.background="#4caf50";
              progText.textContent="\u2713 \u4e0b\u8f7d\u5b8c\u6210";
              setTimeout(function(){progWrap.remove();progText.remove();},2000);
            }
          }
          if(preset.needKey){
            var authR=await window.electronAPI.runHermesCmd(["auth","list"]);
            var hasKey=authR.ok&&authR.stdout.indexOf(preset.slug)>=0;
            if(!hasKey){
              var key=prompt(preset.name+" API Key:");
              if(!key){this.style.color="#888";this.textContent=model;return;}
              await window.electronAPI.runHermesCmd(["auth","add",preset.slug,"--api-key",key,"--type","api-key","--label",preset.name]);
              // 同步更新 .env 文件中的 API 密钥，防止网关使用旧密钥
              if(window.electronAPI.updateEnvKey){
                await window.electronAPI.updateEnvKey(preset.slug, key, preset.base_url);
              }
            }
          }
          // ⚠️ 关键修复：确保所有预设的 custom provider 都正确注册到 config.yaml
          // 当前 config.yaml 只预配了 custom:mimo-v2-5-pro，其他 custom:* 都没有
          // 这导致 Hermes 不认识这些 provider，切换后 gateway 回退到默认的 xiaomi
          if(preset.slug.startsWith("custom:")){
            // 读取当前 custom_providers
            var configResult=await window.electronAPI.runHermesCmd(["config","show"]);
            var customProviders=[];
            if(configResult.ok){
              // 从输出中解析 custom_providers
              var lines=configResult.stdout.split("\n");
              var cpLine=lines.find(function(l){return l.includes("custom_providers:");});
              if(cpLine){
                try{
                  var cpMatch=cpLine.match(/custom_providers:\s*'(.+)'/);
                  if(cpMatch){
                    customProviders=JSON.parse(cpMatch[1]);
                  }
                }catch(e){}
              }
            }
            // 检查是否已存在该 provider
            var exists=customProviders.some(function(p){return p.name===preset.slug;});
            if(!exists){
              // 添加新的 custom provider
              var newProvider={
                name: preset.slug,
                base_url: preset.base_url||"",
                model: model
              };
              customProviders.push(newProvider);
              // 更新 config.yaml
              await window.electronAPI.runHermesCmd(["config","set","custom_providers",JSON.stringify(customProviders)]);
            }
          }
          await window.electronAPI.runHermesCmd(["config","set","provider",preset.slug]);
          await window.electronAPI.runHermesCmd(["config","set","model",model]);
          await window.electronAPI.runHermesCmd(["gateway","restart"]);
          currentModel=model;currentProvider=preset.slug;
          if(window.electronAPI.notifyModelSwitched)window.electronAPI.notifyModelSwitched();
          setTimeout(load,3000);
          this.style.background="#4caf50";this.textContent="\u2713";
        }catch(e){this.style.color="#f44336";this.textContent="\u2717";}
        var self=this;setTimeout(function(){self.style.background="";self.style.color="#888";self.textContent=model;},3000);
      };
    });
    // Custom add
    var addBtn=document.getElementById("ms_add");
    if(addBtn)addBtn.onclick=async function(){
      var u=document.getElementById("ms_u").value.trim(),k=document.getElementById("ms_k").value.trim(),m=document.getElementById("ms_m").value.trim();
      if(!u||!m){this.textContent="\u586b\u5199\u5b8c\u6574";this.style.background="#f44336";var s=this;setTimeout(function(){s.textContent="\u6dfb\u52a0";s.style.background="#f5a623";},2000);return;}
      this.textContent="...";this.disabled=true;
      try{
        u=u.replace(/\/v1\/chat\/completions$/,"/v1").replace(/\/chat\/completions$/,"").replace(/\/completions$/,"").replace(/\/chat$/,"");
        var slug="custom:"+m.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
        if(k)await window.electronAPI.runHermesCmd(["auth","add",slug,"--api-key",k,"--type","api-key","--label",slug]);
        await window.electronAPI.runHermesCmd(["config","set","custom_providers",JSON.stringify([{name:slug,base_url:u,model:m}])]);
        await window.electronAPI.runHermesCmd(["config","set","provider",slug]);
        await window.electronAPI.runHermesCmd(["config","set","model",m]);
        await window.electronAPI.runHermesCmd(["gateway","restart"]);
        if(window.electronAPI.notifyModelSwitched)window.electronAPI.notifyModelSwitched();
        this.textContent="\u2713";this.style.background="#4caf50";
        setTimeout(load,3000);
      }catch(e){this.textContent="\u2717";this.style.background="#f44336";}
      var self=this;setTimeout(function(){self.textContent="\u6dfb\u52a0";self.style.background="#f5a623";self.disabled=false;},3000);
    };
  }

  window.__DUCK_PANELS__=window.__DUCK_PANELS__||{};
  window.__DUCK_PANELS__.model=function(){
    if(panel.style.display==="none"){
      panel.style.display="flex";panel.style.flexDirection="column";
      load();
    }else panel.style.display="none";
  };
  document.addEventListener("click",function(e){
    if(panel.style.display!=="none"&&!panel.contains(e.target))panel.style.display="none";
  });
  getToken();
})()