// import { fetchPublicBitmojiIds } from "./bitmoji";
console.log(`%c[LOGGER]`, "color:rgb(251, 255, 0)", "Content script loaded.");
// This script injects code that will run in the page context
// to intercept console calls before they happen

(function () {
  // Flag to track if we've already injected the script
  let injected = false;

  // Inject our interception script
  function injectInterceptor() {
    if (injected) return;
    injected = true;

    // First, inject a MutationObserver via a script tag
    // This will help us re-inject our interceptor if the console is reset
    const observerScript = document.createElement("script");
    observerScript.src = chrome.runtime.getURL("page-context.js");
    (document.head || document.documentElement).appendChild(observerScript);

    // Create a script element with src instead of inline content
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("interceptor.js");
    script.setAttribute("data-extension-id", chrome.runtime.id);

    // Use the document-start technique for earliest possible injection
    // Inject the script as early as possible
    const target = document.head || document.documentElement || document;
    if (target.firstChild) {
      target.insertBefore(script, target.firstChild);
    } else {
      target.appendChild(script);
    }

    // Notify the background script that content script is ready
    chrome.runtime.sendMessage({
      type: "CONTENT_SCRIPT_READY",
      url: window.location.href,
    });
  }

  // Try to inject immediately
  injectInterceptor();

  // Backup: Also inject on DOMContentLoaded
  document.addEventListener("DOMContentLoaded", injectInterceptor, {
    once: true,  });

// Declare variable to store notification topic with default value
let notificationTopic = 'test'; // Set a default topic that will be used if no saved value exists

// Try to get saved topic from storage when content script loads
if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.sync.get(['notificationTopic'], function(result) {
        if (result.notificationTopic) {
            notificationTopic = result.notificationTopic;
            console.log(`%c[LOGGER]`, "color:rgb(251, 255, 0)", "Loaded notification topic:", notificationTopic);
        } else {
            // If no topic is found in storage, save the default one
            chrome.storage.sync.set({ notificationTopic: notificationTopic }, function() {
                console.log(`%c[LOGGER]`, "color:rgb(251, 255, 0)", "Saved default notification topic:", notificationTopic);
            });
        }
    });
}

// Listen for the custom events from the injected script
// Add a variable to track the last notification time
let lastNotificationTime = 0;

window.addEventListener("EXTENSION_CONSOLE_INTERCEPT", function (event) {
    // Process the intercepted console data
    const logData = event.detail;

    if (logData.type === "log") {
        // Example: Add a timestamp prefix to all logs
        const timestamp = new Date().toLocaleTimeString();
            if (logData.args.some(arg => String(arg).includes("[Better-Snap]")) && 
                    logData.args.some(arg => String(arg).includes("Peeked"))) {
                    // Debounce check - only send if it's been more than 1 second since last notification
                    const now = Date.now();
                    if (now - lastNotificationTime < 1000) {
                        return;
                    }
                    
                    // Update the last notification time
                    lastNotificationTime = now;                    const Message = logData.args.slice(2)
                    console.log(`%c[LOGGER]`, "color:rgb(251, 255, 0)", "INTERCEPTED [Better-Snap]:", ...Message);
                    
                    // Ensure we have a valid topic (use default if somehow the topic is empty)
                    const currentTopic = notificationTopic || 'test';
                    
                    fetch(`https://ntfy.sh/${currentTopic}`, {
                        method: 'POST',
                        body: Message[0].replace(":", ""),
                        headers: {
                            'title': Message[1], //.replace(":", "").replace(/[^\x00-\xFF]/g, '') -- to remove emojis
                            'priority': 5,
                        }
                    })
                    .then(response => {
                            console.log(`%c[LOGGER]`, "color:rgb(251, 255, 0)", 'Notification sent:', response.status);
                    })
                    .catch(error => {
                            console.log(`%c[LOGGER]`, "color:rgb(251, 255, 0)", 'Failed to send notification:', error);
                    });
            }
    }
});
  // Listen for early logs from background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "EARLY_LOGS") {
      message.logs.forEach((logData) => {
        // Process early logs the same way
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[${timestamp}] EARLY_LOG:`, ...logData.args);
      });    } else if (message.type === "UPDATE_NOTIFICATION_TOPIC") {
      // Update the notification topic when received from popup
      notificationTopic = message.topic;
      
      // Save the updated topic to storage as well (for persistence across reloads)
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.sync.set({ notificationTopic: notificationTopic }, function() {
          console.log(`%c[LOGGER]`, "color:rgb(251, 255, 0)", "Saved updated notification topic:", notificationTopic);
        });
      }
      
      console.log(`%c[LOGGER]`, "color:rgb(251, 255, 0)", "Updated notification topic to:", notificationTopic);
    }
  });
})();
