console.log(
  `%c[LOGGER]`,
  "color:rgb(251, 255, 0)",
  "Background script loaded."
);
chrome.webNavigation.onCommitted.addListener(async (details) => {
  if (
    details.frameType !== "outermost_frame" ||
    details.url.startsWith("chrome://") ||
    details.url.startsWith("chrome-extension://")
  ) {
    return;
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId: details.tabId, frameIds: [details.frameId] },
      files: ["content.js"],
      injectImmediately: true,
    });
  } catch (err) {
    console.error("Injection error:", err);
  }
});

const earlyLogs = new Map();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "INTERCEPTED_LOG") {
    console.log("Intercepted from extension:", message.data);

    sendResponse({ received: true });
  } else if (message.type === "CONTENT_SCRIPT_READY") {
    const tabId = sender.tab.id;
    if (earlyLogs.has(tabId)) {
      chrome.tabs.sendMessage(tabId, {
        type: "EARLY_LOGS",
        logs: earlyLogs.get(tabId),
      });
      earlyLogs.delete(tabId);
    }
    sendResponse({ status: "acknowledged" });
  }
  return true;
});
