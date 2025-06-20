console.log(`%c[LOGGER]`, "color:rgb(251, 255, 0)", "Content script loaded.");

(function () {
  let injected = false;

  function injectInterceptor() {
    if (injected) return;
    injected = true;

    const observerScript = document.createElement("script");
    observerScript.src = chrome.runtime.getURL("page-context.js");
    (document.head || document.documentElement).appendChild(observerScript);

    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("interceptor.js");
    script.setAttribute("data-extension-id", chrome.runtime.id);

    const target = document.head || document.documentElement || document;
    if (target.firstChild) {
      target.insertBefore(script, target.firstChild);
    } else {
      target.appendChild(script);
    }

    chrome.runtime.sendMessage({
      type: "CONTENT_SCRIPT_READY",
      url: window.location.href,
    });
  }

  injectInterceptor();

  document.addEventListener("DOMContentLoaded", injectInterceptor, {
    once: true,
  }); let notificationTopic = "test";
  let excludeWords = [];

  function loadSettings() {
    if (typeof chrome !== "undefined" && chrome.storage) {
      chrome.storage.sync.get(["notificationTopic", "excludeWords"], function (result) {
        console.log(`%c[LOGGER]`, "color:rgb(251, 255, 0)", "Loading settings from storage:", result);

        if (result.notificationTopic) {
          notificationTopic = result.notificationTopic;
          console.log(`%c[LOGGER]`, "color:rgb(251, 255, 0)", "Loaded notification topic:", notificationTopic);
        } else {
          chrome.storage.sync.set({ notificationTopic: notificationTopic }, function () {
            console.log(`%c[LOGGER]`, "color:rgb(251, 255, 0)", "Saved default notification topic:", notificationTopic);
          });
        }

        if (result.excludeWords && result.excludeWords.trim().length > 0) {
          excludeWords = result.excludeWords.split(',').map(word => word.trim()).filter(word => word.length > 0);
          console.log(`%c[LOGGER]`, "color:rgb(251, 255, 0)", "Loaded exclude words:", excludeWords);
        } else {
          excludeWords = [];
          console.log(`%c[LOGGER]`, "color:rgb(251, 255, 0)", "No exclude words found, using empty array");
        }
      });
    }
  }

  loadSettings();

  let lastNotificationTime = 0;

  window.addEventListener("EXTENSION_CONSOLE_INTERCEPT", function (event) {
    const logData = event.detail;

    if (logData.type === "log") {
      const timestamp = new Date().toLocaleTimeString();
      if (logData.args.some((arg) => String(arg).includes("[Better-Snap]")) && logData.args.some((arg) => String(arg).includes("Peeked"))) {
        const now = Date.now();
        if (now - lastNotificationTime < 1000) {
          return;
        } lastNotificationTime = now;
        const Message = logData.args.slice(2);

        const messageText = Message.join(' ').toLowerCase();
        console.log(`%c[LOGGER]`, "color:rgb(251, 255, 0)", "Message text to check:", messageText);

        let shouldExclude = false;
        for (let i = 0; i < excludeWords.length; i++) {
          const word = excludeWords[i].toLowerCase();
          if (word.length > 0 && messageText.includes(word)) {
            console.log(`%c[LOGGER]`, "color:rgb(251, 255, 0)", `Found exclude word "${word}" in message, skipping notification`);
            shouldExclude = true;
            break;
          }
        }

        if (shouldExclude) {
          console.log(`%c[LOGGER]`, "color:rgb(251, 255, 0)", "NOTIFICATION BLOCKED - Message contains excluded word:", Message);
          return;
        } else {

          console.log(`%c[LOGGER]`, "color:rgb(251, 255, 0)", "INTERCEPTED [Better-Snap]:", ...Message);

          const currentTopic = notificationTopic || "test";

          fetch(`https://ntfy.sh/${currentTopic}`, {
            method: "POST",
            body: Message[0].replace(":", ""),
            headers: {
              title: Message[1], //.replace(":", "").replace(/[^\x00-\xFF]/g, '') -- to remove emojis
              priority: 5,
            },
          })
            .then((response) => {
              console.log(`%c[LOGGER]`, "color:rgb(251, 255, 0)", "Notification sent:", response.status);
            })
            .catch((error) => {
              console.log(`%c[LOGGER]`, "color:rgb(251, 255, 0)", "Failed to send notification:", error);
            });
        }
      }
    }
  });
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "EARLY_LOGS") {
      message.logs.forEach((logData) => {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[${timestamp}] EARLY_LOG:`, ...logData.args);
      });
    } else if (message.type === "UPDATE_NOTIFICATION_TOPIC") {
      notificationTopic = message.topic;

      if (typeof chrome !== "undefined" && chrome.storage) {
        chrome.storage.sync.set({ notificationTopic: notificationTopic }, function () {
          console.log(`%c[LOGGER]`, "color:rgb(251, 255, 0)", "Saved updated notification topic:", notificationTopic);
        });
      }

      console.log(`%c[LOGGER]`, "color:rgb(251, 255, 0)", "Updated notification topic to:", notificationTopic);
    } else if (message.type === "UPDATE_NOTIFICATION_SETTINGS") {
      console.log(`%c[LOGGER]`, "color:rgb(251, 255, 0)", "Received settings update:", message);

      notificationTopic = message.topic;

      if (message.excludeWords && message.excludeWords.trim().length > 0) {
        excludeWords = message.excludeWords.split(',').map(word => word.trim()).filter(word => word.length > 0);
      } else {
        excludeWords = [];
      }

      if (typeof chrome !== "undefined" && chrome.storage) {
        chrome.storage.sync.set({
          notificationTopic: notificationTopic,
          excludeWords: message.excludeWords || ''
        }, function () {
          console.log(`%c[LOGGER]`, "color:rgb(251, 255, 0)", "Saved updated settings - topic:", notificationTopic, "exclude words:", excludeWords);
        });
      }

      console.log(`%c[LOGGER]`, "color:rgb(251, 255, 0)", "Updated notification settings - topic:", notificationTopic, "exclude words:", excludeWords);
    }
  });
})();
