// This script runs in the page context and overrides console methods
(function () {
  // Check if we've already been injected
  if (window.__consoleInterceptorActive) {
    return;
  }

  // Mark as injected
  window.__consoleInterceptorActive = true;

  // Store the original console methods
  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
    debug: console.debug,
  };

  // Function to intercept and process logs
  function processLog(type, args) {
    // Convert arguments to array for easier handling
    const argsArray = Array.from(args);

    try {
      // Send message to our extension via a custom event
      window.dispatchEvent(
        new CustomEvent("EXTENSION_CONSOLE_INTERCEPT", {
          detail: {
            type: type,
            timestamp: new Date().toISOString(),
            source: getCallSource(),
            args: argsArray.map((arg) => {
              // Handle various types of data
              if (arg === null) return null;
              if (arg === undefined) return undefined;

              try {
                // For objects and arrays, try to stringify
                if (typeof arg === "object") {
                  return JSON.parse(JSON.stringify(arg));
                }
                return arg;
              } catch (e) {
                return String(arg);
              }
            }),
          },
        })
      );
    } catch (e) {
      // If something goes wrong with interception, log silently
      originalConsole.error("Console interceptor error:", e);
    }

    // Call the original method with the original arguments
    return originalConsole[type].apply(console, args);
  }

  // Function to get call stack information to identify the source
  function getCallSource() {
    try {
      const err = new Error();
      const stack = err.stack || "";
      const lines = stack.split("\n").slice(3, 4); // Skip the first few lines which are our own functions
      return lines.length > 0 ? lines[0].trim() : "unknown";
    } catch (e) {
      return "unknown";
    }
  }

  // Override each console method
  console.log = function () {
    return processLog("log", arguments);
  };
  console.warn = function () {
    return processLog("warn", arguments);
  };
  console.error = function () {
    return processLog("error", arguments);
  };
  console.info = function () {
    return processLog("info", arguments);
  };
  console.debug = function () {
    return processLog("debug", arguments);
  };

  // Indicate that the interceptor is active
  originalConsole.log("Console interceptor activated");

  // Reset detection
  const originalDefineProperty = Object.defineProperty;
  Object.defineProperty = function (obj, prop, descriptor) {
    if (obj === console && originalConsole.hasOwnProperty(prop)) {
      // Someone is trying to redefine a console method
      originalConsole.warn(
        "Console." + prop + " redefinition detected, reapplying interceptor"
      );
      const result = originalDefineProperty.call(this, obj, prop, descriptor);
      // Re-override with our version
      console[prop] = function () {
        return processLog(prop, arguments);
      };
      return result;
    }
    return originalDefineProperty.call(this, obj, prop, descriptor);
  };
})();
