(function(){
  var ws=null, token="", sid=null, ready=false;
  var msgsEl=document.getElementById("msgs");
  var statusEl=document.getElementById("status");
  var inputEl=document.getElementById("textInput");
  var idleHint=document.getElementById("idleHint");
  var modeBtn=document.getElementById("modeBtn");
  var _bb=null, _bt="";
  var _hideTimeout=null;
  var _isVisible=true;
  var _continuousMode=true; // Default to continuous mode for Jarvis-like experience

  function setStatus(text, cls){
    statusEl.textContent=text;
    statusEl.className="status"+(cls?" "+cls:"");
  }

  function removeIdleHint(){
    if(idleHint)idleHint.remove();idleHint=null;
  }

  function addMsg(type, text){
    removeIdleHint();
    if(!text)return;
    var d=document.createElement("div");
    d.className="msg "+(type==="user"?"user":type==="sys"?"sys":"duck");
    var b=document.createElement("div");b.className="bubble";b.textContent=text;
    d.appendChild(b);
    msgsEl.appendChild(d);
    msgsEl.scrollTop=msgsEl.scrollHeight;
  }

  function startBotStream(){_bt="";_bb=null;}
  function addBotChunk(text){
    _bt+=text;
    if(!_bb){
      removeIdleHint();
      var d=document.createElement("div");d.className="msg duck";
      _bb=document.createElement("div");_bb.className="bubble";
      d.appendChild(_bb);msgsEl.appendChild(d);
    }
    _bb.textContent=_bt;
    msgsEl.scrollTop=msgsEl.scrollHeight;
  }
  function endBotStream(text){
    if(_bb){_bb.textContent=text||_bt;_bb=null;_bt="";}
    else if(text){addMsg("duck",text);}
  }

  function speak(text){
    if(window.electronAPI&&window.electronAPI.ttsSpeak){
      window.electronAPI.ttsSpeak(text);
    }
  }

  async function getTokenAndConnect(){
    try{
      if(window.electronAPI&&window.electronAPI.getSessionToken){
        token=await window.electronAPI.getSessionToken();
      }
    }catch(e){}
    if(!token){
      try{
        var r=await fetch("http://127.0.0.1:9119/");
        var h=await r.text();
        var m=h.match(/__HERMES_SESSION_TOKEN__\s*=\s*"([^"]+)"/);
        if(m)token=m[1];
      }catch(e){}
    }
    if(token)connectWS();
    else setTimeout(getTokenAndConnect,3000);
  }

  function connectWS(){
    if(ws){try{ws.close();}catch(e){}}
    ready=false;sid=null;
    try{
      ws=new WebSocket("ws://127.0.0.1:9119/api/ws?token="+encodeURIComponent(token));
    }catch(e){
      setTimeout(connectWS,5000);return;
    }
    var timeout=setTimeout(function(){
      if(ws&&ws.readyState!==1){try{ws.close();}catch(e){}}
    },10000);

    ws.onopen=function(){
      clearTimeout(timeout);
      setStatus("已连接");
      ws.send(JSON.stringify({jsonrpc:"2.0",method:"session.create",id:1,params:{}}));
    };
    ws.onmessage=function(e){
      try{
        var msg=JSON.parse(e.data);
        if(msg.method==="event"&&msg.params){
          var p=msg.params.payload||{}, t=msg.params.type;
          if(t==="session.info"&&p.model){ready=true;}
          else if(t==="message.start"){setStatus("思考中","thinking");startBotStream();}
          else if(t==="message.delta"&&p.text)addBotChunk(p.text);
          else if(t==="message.complete"){
            endBotStream(p.text);
            setStatus("待命中");
            if(_bt||p.text)speak(_bt||p.text);
            resetAutoHide();
          }
          else if(t==="tool.start"&&p.name){
            addMsg("sys","\uD83D\uDD27 "+p.name);
            setStatus("工作中","thinking");
          }
          else if(t==="error"){
            addMsg("sys","\u274C "+(p.message||p.text||""));
            setStatus("待命中");
          }
        }
        if(msg.result&&msg.result.session_id){
          sid=msg.result.session_id;ready=true;
        }
      }catch(x){}
    };
    ws.onclose=function(){
      clearTimeout(timeout);
      setStatus("重连中");
      ready=false;ws=null;
      setTimeout(connectWS,3000);
    };
    ws.onerror=function(){};
  }

  function sendToHermes(text){
    if(!ws||ws.readyState!==1){addMsg("sys","未连接");return;}
    addMsg("user",text);
    if(!sid||!ready){
      var _retryCount=0;
      var _retryMax=20;
      var _retryTimer=setInterval(function(){
        _retryCount++;
        if(sid&&ready){
          clearInterval(_retryTimer);
          setStatus("思考中","thinking");
          ws.send(JSON.stringify({
            jsonrpc:"2.0",method:"prompt.submit",
            id:Date.now(),
            params:{session_id:sid,text:text}
          }));
        }else if(_retryCount>=_retryMax){
          clearInterval(_retryTimer);
          addMsg("sys","等待连接超时，请稍后重试");
          setStatus("就绪");
        }
      },500);
      return;
    }
    setStatus("思考中","thinking");
    ws.send(JSON.stringify({
      jsonrpc:"2.0",method:"prompt.submit",
      id:Date.now(),
      params:{session_id:sid,text:text}
    }));
  }

  function resetAutoHide(){
    clearTimeout(_hideTimeout);
    // Don't auto-hide in continuous mode
    if(_continuousMode)return;
    _hideTimeout=setTimeout(function(){
      if(window.electronAPI&&window.electronAPI.dialogAutoHide){
        window.electronAPI.dialogAutoHide();
      }
    },15000);
  }

  function updateModeBtn(){
    if(!modeBtn)return;
    if(_continuousMode){
      modeBtn.classList.add("active");
      modeBtn.title="连续模式已开启 (点击切换)";
    }else{
      modeBtn.classList.remove("active");
      modeBtn.title="普通模式 (点击切换到连续模式)";
    }
  }

  function toggleMode(){
    _continuousMode=!_continuousMode;
    updateModeBtn();
    if(window.electronAPI&&window.electronAPI.setVoiceMode){
      window.electronAPI.setVoiceMode(_continuousMode?"continuous":"normal");
    }
    if(_continuousMode){
      addMsg("sys","🎤 已切换到连续模式，我可以一直听你说话~");
      clearTimeout(_hideTimeout);
    }else{
      addMsg("sys","🔇 已切换到普通模式，说完我会自动休息~");
    }
  }

  if(modeBtn){
    modeBtn.onclick=toggleMode;
    updateModeBtn();
  }

  if(window.electronAPI&&window.electronAPI.onSpeechText){
    window.electronAPI.onSpeechText(function(text){
      if(!text)return;
      sendToHermes(text);
      clearTimeout(_hideTimeout);
    });
  }
  if(window.electronAPI&&window.electronAPI.onDialogShow){
    window.electronAPI.onDialogShow(function(){
      _isVisible=true;
      clearTimeout(_hideTimeout);
      setStatus("在听...","listening");
    });
  }
  if(window.electronAPI&&window.electronAPI.onDialogHide){
    window.electronAPI.onDialogHide(function(){
      _isVisible=false;
      setStatus("待命中");
    });
  }
  if(window.electronAPI&&window.electronAPI.onDialogSilence){
    window.electronAPI.onDialogSilence(function(){
      setStatus("待命中");
      resetAutoHide();
    });
  }
  if(window.electronAPI&&window.electronAPI.onDialogListening){
    window.electronAPI.onDialogListening(function(){
      setStatus("在听...","listening");
      clearTimeout(_hideTimeout);
    });
  }
  if(window.electronAPI&&window.electronAPI.onVoiceModeChanged){
    window.electronAPI.onVoiceModeChanged(function(mode){
      if(mode==="continuous"){
        _continuousMode=true;
        setStatus("持续监听中","listening");
        updateModeBtn();
        clearTimeout(_hideTimeout);
      }else{
        _continuousMode=false;
        setStatus("待命中");
        updateModeBtn();
      }
    });
  }
  var levelFill=document.getElementById("levelFill");
  if(window.electronAPI&&window.electronAPI.onAudioLevel){
    window.electronAPI.onAudioLevel(function(info){
      if(!levelFill||!info)return;
      var pct=Math.min(100,Math.round(info.level/(info.threshold||400)*60));
      levelFill.style.width=pct+"%";
      if(pct>60)levelFill.style.background="#f44336";
      else if(pct>30)levelFill.style.background="#ffa726";
      else levelFill.style.background="#4CAF50";
    });
  }

  function sendInput(){
    var text=inputEl.value.trim();
    if(!text)return;
    inputEl.value="";
    sendToHermes(text);
    resetAutoHide();
  }
  document.getElementById("sendBtn").onclick=sendInput;
  inputEl.onkeydown=function(e){
    if(e.key==="Enter"){e.preventDefault();sendInput();}
  };

  document.getElementById("closeBtn").onclick=function(){
    if(window.electronAPI&&window.electronAPI.dialogClose){
      window.electronAPI.dialogClose();
    }
  };

  getTokenAndConnect();
  setStatus("待命中");
})();
