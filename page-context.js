(function () {
  if (window.__consoleObserverActive) {
    return;
  }
  window.__consoleObserverActive = true;

  function checkConsole() {
    if (!window.__consoleInterceptorActive) {
      const script = document.createElement("script");
      script.src = document
        .querySelector("script[data-extension-id]")
        .getAttribute("src");
      script.setAttribute(
        "data-extension-id",
        document
          .querySelector("script[data-extension-id]")
          .getAttribute("data-extension-id")
      );
      document.head.appendChild(script);
    }
  }

  setInterval(checkConsole, 500);

  const observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      if (mutation.type === "childList") {
        mutation.addedNodes.forEach(function (node) {
          if (node.tagName === "SCRIPT") {
            setTimeout(checkConsole, 0);
          }
        });
      }
    });
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
})();
