(function () {
  if (window.__consoleInterceptorActive) {
    return;
  }

  window.__consoleInterceptorActive = true;

  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
    debug: console.debug,
  };

  function processLog(type, args) {
    const argsArray = Array.from(args);

    try {
      window.dispatchEvent(
        new CustomEvent("EXTENSION_CONSOLE_INTERCEPT", {
          detail: {
            type: type,
            timestamp: new Date().toISOString(),
            source: getCallSource(),
            args: argsArray.map((arg) => {
              if (arg === null) return null;
              if (arg === undefined) return undefined;

              try {
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
      originalConsole.error("Console interceptor error:", e);
    }

    return originalConsole[type].apply(console, args);
  }

  function getCallSource() {
    try {
      const err = new Error();
      const stack = err.stack || "";
      const lines = stack.split("\n").slice(3, 4);
      return lines.length > 0 ? lines[0].trim() : "unknown";
    } catch (e) {
      return "unknown";
    }
  }

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

  originalConsole.log("Console interceptor activated");

  const originalDefineProperty = Object.defineProperty;
  Object.defineProperty = function (obj, prop, descriptor) {
    if (obj === console && originalConsole.hasOwnProperty(prop)) {
      originalConsole.warn(
        "Console." + prop + " redefinition detected, reapplying interceptor"
      );
      const result = originalDefineProperty.call(this, obj, prop, descriptor);
      console[prop] = function () {
        return processLog(prop, arguments);
      };
      return result;
    }
    return originalDefineProperty.call(this, obj, prop, descriptor);
  };
})();
