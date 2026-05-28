/**
 * Duck Desktop setup wizard script.
 * Handles environment checking, dependency installation, and API configuration.
 */
(function() {
  var checkItems = [
    { id: "python", name: "Python 3.8+", icon: "\ud83d\udc0d" },
    { id: "pip", name: "pip \u5305\u7ba1\u7406\u5668", icon: "\ud83d\udce6" },
    { id: "sounddevice", name: "sounddevice\uff08\u97f3\u9891\u5f55\u5236\uff09", icon: "\ud83c\udfa4" },
    { id: "numpy", name: "numpy\uff08\u6570\u503c\u8ba1\u7b97\uff09", icon: "\ud83d\udd22" },
    { id: "faster-whisper", name: "faster-whisper\uff08\u8bed\u97f3\u8bc6\u522b\uff09", icon: "\ud83e\udde0" },
    { id: "whisper-model", name: "Whisper small \u6a21\u578b", icon: "\ud83d\udce5" },
    { id: "hermes", name: "Hermes Agent", icon: "\u26a1" },
    { id: "gpu", name: "NVIDIA GPU\uff08\u53ef\u9009\uff09", icon: "\ud83c\udfae" }
  ];

  var checkResults = {};
  var installQueue = [];

  function renderItem(container, item, status, detail) {
    var el = document.getElementById("ci-" + item.id);
    if (!el) {
      el = document.createElement("div");
      el.className = "check-item";
      el.id = "ci-" + item.id;
      container.appendChild(el);
    }
    var icon = status === "ok" ? "\u2705" : status === "fail" ? "\u274c" : status === "checking" ? "\u23f3" : "\u2b1c";
    var cls = status === "ok" ? "ok" : status === "fail" ? "fail" : status === "checking" ? "installing" : "pending";
    el.innerHTML = '<span class="check-icon">' + icon + '</span>' +
      '<span class="check-name">' + item.icon + " " + item.name + '</span>' +
      '<span class="check-status ' + cls + '">' + (detail || status) + '</span>';
  }

  function startCheck() {
    var list = document.getElementById("check-list");
    list.innerHTML = "";
    checkItems.forEach(function(item) {
      renderItem(list, item, "checking", "\u68c0\u6d4b\u4e2d...");
    });
    document.getElementById("check-progress").style.width = "0%";
    document.getElementById("btn-recheck").style.display = "none";
    document.getElementById("footer-status").textContent = "\u6b63\u5728\u68c0\u6d4b\u73af\u5883...";

    if (window.electronAPI && window.electronAPI.runSetup) {
      window.electronAPI.runSetup("check");
    }
  }

  window.onSetupEvent = function(ev) {
    if (ev.event === "checking") {
      document.getElementById("footer-status").textContent = "\u68c0\u6d4b " + ev.item + "...";
    }
    else if (ev.event === "result") {
      checkResults[ev.item] = ev;
      var list = document.getElementById("check-list");
      var item = checkItems.find(function(c) { return c.id === ev.item; });
      if (item) renderItem(list, item, ev.ok ? "ok" : "fail", ev.detail);

      var done = Object.keys(checkResults).length;
      document.getElementById("check-progress").style.width = (done / checkItems.length * 100) + "%";
    }
    else if (ev.event === "done") {
      document.getElementById("footer-status").textContent = ev.all_ok ? "\u6240\u6709\u4f9d\u8d56\u5df2\u5c31\u7eea\uff01" : "\u6709\u7f3a\u5931\u4f9d\u8d56\u9700\u8981\u5b89\u88c5";
      document.getElementById("btn-recheck").style.display = "inline-block";

      if (!ev.all_ok) {
        document.getElementById("step2").classList.remove("hidden");
        var installList = document.getElementById("install-list");
        installList.innerHTML = "";
        installQueue = [];
        checkItems.forEach(function(item) {
          var r = checkResults[item.id];
          if (r && !r.ok && item.id !== "gpu") {
            installQueue.push(item);
            renderItem(installList, item, "pending", "\u5f85\u5b89\u88c5");
          }
        });
      } else {
        document.getElementById("step3").classList.remove("hidden");
      }
    }
    else if (ev.event === "installing") {
      var el = document.getElementById("ii-" + ev.item);
      if (el) {
        var icon = el.querySelector(".check-icon");
        var status = el.querySelector(".check-status");
        if (icon) icon.textContent = "\u23f3";
        if (status) { status.textContent = "\u5b89\u88c5\u4e2d..."; status.className = "check-status installing"; }
      }
      document.getElementById("install-status").textContent = "\u6b63\u5728\u5b89\u88c5 " + ev.item + "...";
    }
    else if (ev.event === "installed") {
      var el = document.getElementById("ii-" + ev.item);
      if (el) {
        var icon = el.querySelector(".check-icon");
        var status = el.querySelector(".check-status");
        if (icon) icon.textContent = ev.ok ? "\u2705" : "\u274c";
        if (status) { status.textContent = ev.ok ? "\u5df2\u5b89\u88c5" : "\u5931\u8d25"; status.className = "check-status " + (ev.ok ? "ok" : "fail"); }
      }
    }
    else if (ev.event === "deps-done" || ev.event === "model-done" || ev.event === "all-done") {
      document.getElementById("install-status").textContent = "\u5b89\u88c5\u5b8c\u6210\uff01";
      document.getElementById("step3").classList.remove("hidden");
    }
  };

  document.getElementById("btn-recheck").onclick = startCheck;
  document.getElementById("btn-install").onclick = function() {
    if (window.electronAPI && window.electronAPI.runSetup) {
      window.electronAPI.runSetup("install");
    }
  };
  document.getElementById("btn-save").onclick = function() {
    var port = document.getElementById("api-port").value.trim() || "8642";
    var key = document.getElementById("api-key").value.trim();
    if (window.electronAPI && window.electronAPI.saveConfig) {
      window.electronAPI.saveConfig({ apiPort: parseInt(port), apiKey: key });
    }
  };
  document.getElementById("cls").onclick = function() {
    if (window.electronAPI && window.electronAPI.closeSetup) {
      window.electronAPI.closeSetup();
    }
  };

  startCheck();
})();
