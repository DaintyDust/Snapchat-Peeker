// Listen for messages from the content script
console.log(
  `%c[LOGGER]`,
  "color:rgb(251, 255, 0)",
  "Background script loaded."
);

// Function to check if we have permission for a URL
function isUrlPermitted(url) {
  try {
    const permittedPatterns = [
      "https://web.snapchat.com/*",
      "https://*.snapchat.com/*"
    ];
    
    return permittedPatterns.some(pattern => {
      // Convert the pattern to a regex
      const regex = new RegExp(
        "^" + pattern.replace(/\./g, "\\.").replace(/\*/g, ".*") + "$"
      );
      return regex.test(url);
    });
  } catch (err) {
    console.error("Error checking URL permission:", err);
    return false;
  }
}

// Use webNavigation API to inject as early as possible
chrome.webNavigation.onCommitted.addListener(async (details) => {
  // Skip non-standard navigations
  if (
    details.frameType !== "outermost_frame" ||
    details.url.startsWith("chrome://") ||
    details.url.startsWith("chrome-extension://")
  ) {
    return;
  }

  // Check if the URL matches the patterns we have permission for
  if (!isUrlPermitted(details.url)) {
    console.log("Skipping injection - no permission for URL:", details.url);
    return;
  }

  try {
    // Execute script via scripting API (another method to ensure early injection)
    await chrome.scripting.executeScript({
      target: { tabId: details.tabId, frameIds: [details.frameId] },
      files: ["content.js"],
      injectImmediately: true,
    });
  } catch (err) {
    console.error("Injection error:", err);
  }
});

// Pre-capture buffer for logs that might come in before our content script is fully set up
const earlyLogs = new Map();

// Listen for messages from the content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "INTERCEPTED_LOG") {
    // Process the intercepted console log
    console.log("Intercepted from extension:", message.data);

    // You can store logs, analyze them, or forward them elsewhere

    // Respond to confirm receipt
    sendResponse({ received: true });
  } else if (message.type === "CONTENT_SCRIPT_READY") {
    // If we have any early logs for this tab, send them now
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
  return true; // Needed for async response
});
