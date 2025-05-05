// This script observes DOM changes to detect potential console resets
(function () {
  // Skip if we already have an observer
  if (window.__consoleObserverActive) {
    return;
  }
  window.__consoleObserverActive = true;

  // Function to check if console methods have been reset
  function checkConsole() {
    // If our flag isn't there, it means the console was reset
    if (!window.__consoleInterceptorActive) {
      // Re-inject our script
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

  // Set up interval to periodically check console state
  setInterval(checkConsole, 500);

  // Also monitor for script injections that might modify the console
  const observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      if (mutation.type === "childList") {
        // When new scripts are added, check if our console override is still active
        mutation.addedNodes.forEach(function (node) {
          if (node.tagName === "SCRIPT") {
            setTimeout(checkConsole, 0);
          }
        });
      }
    });
  });

  // Start observing
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
})();
