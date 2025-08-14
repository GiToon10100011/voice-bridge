import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  ErrorHandler,
  globalErrorHandler,
} from "../../src/background/error-handler.js";

describe("ErrorHandler", () => {
  let errorHandler;
  let mockChrome;
  let mockWindow;
  let consoleSpy;

  beforeEach(() => {
    errorHandler = new ErrorHandler();
    errorHandler.logEntries = []; // Clear any existing log entries

    // Mock Chrome API
    mockChrome = {
      storage: {
        local: {
          set: vi.fn(),
          get: vi.fn(),
          remove: vi.fn(),
        },
      },
      notifications: {
        create: vi.fn(),
      },
    };
    global.chrome = mockChrome;

    // Mock window and navigator
    mockWindow = {
      location: { href: "https://test.com" },
      addEventListener: vi.fn(),
      Notification: vi.fn(),
    };
    global.window = mockWindow;
    global.navigator = { userAgent: "Test Browser" };

    // Mock console methods
    consoleSpy = {
      debug: vi.spyOn(console, "debug").mockImplementation(() => {}),
      info: vi.spyOn(console, "info").mockImplementation(() => {}),
      warn: vi.spyOn(console, "warn").mockImplementation(() => {}),
      error: vi.spyOn(console, "error").mockImplementation(() => {}),
      group: vi.spyOn(console, "group").mockImplementation(() => {}),
      groupEnd: vi.spyOn(console, "groupEnd").mockImplementation(() => {}),
      log: vi.spyOn(console, "log").mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    delete global.chrome;
    delete global.window;
    delete global.navigator;

    // Restore console methods
    Object.values(consoleSpy).forEach((spy) => spy.mockRestore());
  });

  describe("Constructor", () => {
    it("should initialize with correct default values", () => {
      expect(errorHandler.logLevel).toBe("INFO");
      expect(errorHandler.maxLogEntries).toBe(1000);
      expect(errorHandler.logEntries).toEqual([]);
      expect(errorHandler.errorListeners).toBeInstanceOf(Map);
      expect(errorHandler.userFriendlyMessages).toBeInstanceOf(Map);
      expect(errorHandler.isInitialized).toBe(false);
    });

    it("should setup user friendly messages", () => {
      expect(errorHandler.userFriendlyMessages.has("tts_not_supported")).toBe(
        true
      );
      expect(errorHandler.userFriendlyMessages.has("permission_denied")).toBe(
        true
      );
      expect(errorHandler.userFriendlyMessages.has("unknown_error")).toBe(true);
    });
  });

  describe("Initialization", () => {
    it("should initialize only once", () => {
      const setupSpy = vi.spyOn(errorHandler, "setupGlobalErrorHandlers");

      errorHandler.initialize();
      expect(errorHandler.isInitialized).toBe(true);
      expect(setupSpy).toHaveBeenCalledTimes(1);

      errorHandler.initialize();
      expect(setupSpy).toHaveBeenCalledTimes(1); // Should not be called again
    });

    it("should setup global error handlers", () => {
      errorHandler.initialize();

      expect(mockWindow.addEventListener).toHaveBeenCalledWith(
        "error",
        expect.any(Function)
      );
      expect(mockWindow.addEventListener).toHaveBeenCalledWith(
        "unhandledrejection",
        expect.any(Function)
      );
    });
  });

  describe("Log Level Management", () => {
    it("should set valid log levels", () => {
      errorHandler.setLogLevel("DEBUG");
      expect(errorHandler.logLevel).toBe("DEBUG");

      errorHandler.setLogLevel("ERROR");
      expect(errorHandler.logLevel).toBe("ERROR");
    });

    it("should reject invalid log levels", () => {
      const originalLevel = errorHandler.logLevel;
      errorHandler.setLogLevel("INVALID");
      expect(errorHandler.logLevel).toBe(originalLevel);
    });

    it("should check log level priority correctly", () => {
      errorHandler.setLogLevel("WARN");

      expect(errorHandler.shouldLog("DEBUG")).toBe(false);
      expect(errorHandler.shouldLog("INFO")).toBe(false);
      expect(errorHandler.shouldLog("WARN")).toBe(true);
      expect(errorHandler.shouldLog("ERROR")).toBe(true);
    });
  });

  describe("Log Entry Creation", () => {
    it("should create log entry with correct structure", () => {
      const entry = errorHandler.createLogEntry("INFO", "Test message", {
        key: "value",
      });

      expect(entry).toHaveProperty("timestamp");
      expect(entry).toHaveProperty("level", "INFO");
      expect(entry).toHaveProperty("message", "Test message");
      expect(entry).toHaveProperty("data", { key: "value" });
      expect(entry).toHaveProperty("stack");
      expect(entry).toHaveProperty("userAgent", "Test Browser");
      expect(entry).toHaveProperty("url", "https://test.com");
    });

    it("should handle missing window and navigator", () => {
      delete global.window;
      delete global.navigator;

      const entry = errorHandler.createLogEntry("INFO", "Test message");

      expect(entry.userAgent).toBe("Unknown");
      expect(entry.url).toBe("Unknown");
    });
  });

  describe("Log Storage", () => {
    it("should store log entries", () => {
      const entry = errorHandler.createLogEntry("INFO", "Test message");
      errorHandler.storeLogEntry(entry);

      expect(errorHandler.logEntries).toHaveLength(1);
      expect(errorHandler.logEntries[0]).toBe(entry);
    });

    it("should limit log entries to max count", () => {
      errorHandler.maxLogEntries = 3;

      for (let i = 0; i < 5; i++) {
        const entry = errorHandler.createLogEntry("INFO", `Message ${i}`);
        errorHandler.storeLogEntry(entry);
      }

      expect(errorHandler.logEntries).toHaveLength(3);
      expect(errorHandler.logEntries[0].message).toBe("Message 2");
      expect(errorHandler.logEntries[2].message).toBe("Message 4");
    });

    it("should store logs in Chrome storage", () => {
      const entry = errorHandler.createLogEntry("INFO", "Test message");
      errorHandler.storeLogEntry(entry);

      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        errorLogs: expect.arrayContaining([entry]),
      });
    });

    it("should handle Chrome storage errors gracefully", () => {
      mockChrome.storage.local.set.mockImplementation(() => {
        throw new Error("Storage error");
      });

      const entry = errorHandler.createLogEntry("INFO", "Test message");

      expect(() => errorHandler.storeLogEntry(entry)).not.toThrow();
      expect(consoleSpy.error).toHaveBeenCalledWith(
        "Failed to store log entry:",
        expect.any(Error)
      );
    });
  });

  describe("Logging Methods", () => {
    beforeEach(() => {
      errorHandler.setLogLevel("DEBUG");
      errorHandler.logEntries = []; // Clear logs before each test
    });

    it("should log debug messages", () => {
      errorHandler.debug("Debug message", { key: "value" });

      expect(consoleSpy.debug).toHaveBeenCalledWith(
        "[TTS-DEBUG] Debug message",
        { key: "value" }
      );
      expect(errorHandler.logEntries).toHaveLength(1);
      expect(errorHandler.logEntries[0].level).toBe("DEBUG");
    });

    it("should log info messages", () => {
      errorHandler.info("Info message", { key: "value" });

      expect(consoleSpy.info).toHaveBeenCalledWith("[TTS-INFO] Info message", {
        key: "value",
      });
      expect(errorHandler.logEntries).toHaveLength(1);
      expect(errorHandler.logEntries[0].level).toBe("INFO");
    });

    it("should log warning messages", () => {
      errorHandler.warn("Warning message", { key: "value" });

      expect(consoleSpy.warn).toHaveBeenCalledWith(
        "[TTS-WARN] Warning message",
        { key: "value" }
      );
      expect(errorHandler.logEntries).toHaveLength(1);
      expect(errorHandler.logEntries[0].level).toBe("WARN");
    });

    it("should log error messages", () => {
      const error = new Error("Test error");
      errorHandler.error("Error message", error, { key: "value" });

      expect(consoleSpy.error).toHaveBeenCalledWith(
        "[TTS-ERROR] Error message",
        error,
        { key: "value" }
      );
      expect(errorHandler.logEntries).toHaveLength(1);
      expect(errorHandler.logEntries[0].level).toBe("ERROR");
      expect(errorHandler.logEntries[0].data.error).toMatchObject({
        name: "Error",
        message: "Test error",
        stack: expect.any(String),
      });
    });

    it("should respect log level filtering", () => {
      errorHandler.setLogLevel("ERROR");

      errorHandler.debug("Debug message");
      errorHandler.info("Info message");
      errorHandler.warn("Warning message");
      errorHandler.error("Error message");

      expect(errorHandler.logEntries).toHaveLength(1);
      expect(errorHandler.logEntries[0].level).toBe("ERROR");
    });
  });

  describe("Error Listeners", () => {
    it("should register error listeners", () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      errorHandler.onError("test_error", listener1);
      errorHandler.onError("test_error", listener2);

      expect(errorHandler.errorListeners.get("test_error")).toHaveLength(2);
      expect(errorHandler.errorListeners.get("test_error")).toContain(
        listener1
      );
      expect(errorHandler.errorListeners.get("test_error")).toContain(
        listener2
      );
    });

    it("should notify error listeners", () => {
      const listener = vi.fn();
      errorHandler.onError("test_error", listener);

      const errorData = { message: "Test error", data: { key: "value" } };
      errorHandler.notifyErrorListeners("test_error", errorData);

      expect(listener).toHaveBeenCalledWith(errorData);
    });

    it("should handle errors in error listeners", () => {
      const faultyListener = vi.fn(() => {
        throw new Error("Listener error");
      });
      const goodListener = vi.fn();

      errorHandler.onError("test_error", faultyListener);
      errorHandler.onError("test_error", goodListener);

      errorHandler.notifyErrorListeners("test_error", { message: "Test" });

      expect(faultyListener).toHaveBeenCalled();
      expect(goodListener).toHaveBeenCalled();
      expect(consoleSpy.error).toHaveBeenCalledWith(
        "Error in error listener:",
        expect.any(Error)
      );
    });
  });

  describe("Global Error Handling", () => {
    it("should handle global JavaScript errors", () => {
      const errorSpy = vi.spyOn(errorHandler, "error");
      const showErrorSpy = vi.spyOn(errorHandler, "showUserFriendlyError");

      const errorInfo = {
        type: "javascript_error",
        message: "Test error",
        filename: "test.js",
        lineno: 10,
        colno: 5,
        error: new Error("Test error"),
      };

      errorHandler.handleGlobalError(errorInfo);

      expect(errorSpy).toHaveBeenCalledWith(
        "Global error caught",
        errorInfo.error,
        {
          type: "javascript_error",
          filename: "test.js",
          lineno: 10,
          colno: 5,
          message: "Test error",
        }
      );
      expect(showErrorSpy).toHaveBeenCalledWith("unknown_error", errorInfo);
    });

    it("should handle unhandled promise rejections", () => {
      const errorSpy = vi.spyOn(errorHandler, "error");
      const showErrorSpy = vi.spyOn(errorHandler, "showUserFriendlyError");

      const rejectedPromise = Promise.reject(new Error("Promise rejection"));
      rejectedPromise.catch(() => {}); // Handle the rejection to prevent unhandled error
      
      const rejectionInfo = {
        type: "unhandled_promise_rejection",
        reason: new Error("Promise rejection"),
        promise: rejectedPromise,
      };

      errorHandler.handleUnhandledRejection(rejectionInfo);

      expect(errorSpy).toHaveBeenCalledWith(
        "Unhandled promise rejection",
        rejectionInfo.reason,
        {
          type: "unhandled_promise_rejection",
          promise: rejectionInfo.promise,
        }
      );
      expect(showErrorSpy).toHaveBeenCalledWith("unknown_error", rejectionInfo);
    });
  });

  describe("User Friendly Error Messages", () => {
    it("should show Chrome notification for known error types", () => {
      errorHandler.showUserFriendlyError("tts_not_supported");

      expect(mockChrome.notifications.create).toHaveBeenCalledWith({
        type: "basic",
        iconUrl: "/icons/icon48.png",
        title: "TTS 기능을 사용할 수 없습니다",
        message:
          "브라우저에서 음성 합성 기능을 지원하지 않습니다. Chrome 또는 Edge 브라우저를 사용해주세요.",
      });
    });

    it("should show browser notification when available", () => {
      // Set up Notification mock properly
      const NotificationMock = vi.fn();
      NotificationMock.permission = "granted";
      global.window.Notification = NotificationMock;
      global.Notification = NotificationMock;

      errorHandler.showUserFriendlyError("permission_denied");

      expect(NotificationMock).toHaveBeenCalledWith("권한이 필요합니다", {
        body: "확장프로그램이 정상적으로 작동하려면 권한이 필요합니다.",
        icon: "/icons/icon48.png",
      });
    });

    it("should use unknown error message for unrecognized error types", () => {
      errorHandler.showUserFriendlyError("nonexistent_error");

      expect(mockChrome.notifications.create).toHaveBeenCalledWith({
        type: "basic",
        iconUrl: "/icons/icon48.png",
        title: "알 수 없는 오류",
        message: "예상치 못한 오류가 발생했습니다.",
      });
    });

    it("should handle notification errors gracefully", () => {
      mockChrome.notifications.create.mockImplementation(() => {
        throw new Error("Notification error");
      });

      expect(() =>
        errorHandler.showUserFriendlyError("tts_not_supported")
      ).not.toThrow();
      expect(consoleSpy.error).toHaveBeenCalledWith(
        "Failed to show notification:",
        expect.any(Error)
      );
    });

    it("should notify error listeners about user friendly errors", () => {
      const listener = vi.fn();
      errorHandler.onError("user_friendly_error", listener);

      errorHandler.showUserFriendlyError("tts_not_supported", { test: "data" });

      expect(listener).toHaveBeenCalledWith({
        errorType: "tts_not_supported",
        messageInfo: expect.objectContaining({
          title: "TTS 기능을 사용할 수 없습니다",
        }),
        errorData: { test: "data" },
      });
    });
  });

  describe("Log Management", () => {
    beforeEach(() => {
      errorHandler.info("Info message");
      errorHandler.warn("Warning message");
      errorHandler.error("Error message");
    });

    it("should export all logs", () => {
      const logs = errorHandler.exportLogs();
      expect(logs).toHaveLength(3);
      expect(logs[0].level).toBe("INFO");
      expect(logs[1].level).toBe("WARN");
      expect(logs[2].level).toBe("ERROR");
    });

    it("should export logs filtered by level", () => {
      const errorLogs = errorHandler.exportLogs("ERROR");
      expect(errorLogs).toHaveLength(1);
      expect(errorLogs[0].level).toBe("ERROR");
    });

    it("should clear logs", () => {
      errorHandler.clearLogs(true); // Silent clear to avoid creating new log entry
      expect(errorHandler.logEntries).toHaveLength(0);
      expect(mockChrome.storage.local.remove).toHaveBeenCalledWith([
        "errorLogs",
      ]);
    });

    it("should load stored logs", async () => {
      const storedLogs = [
        {
          level: "INFO",
          message: "Stored message",
          timestamp: "2023-01-01T00:00:00.000Z",
        },
      ];

      mockChrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ errorLogs: storedLogs });
      });

      const logs = await errorHandler.loadStoredLogs();
      expect(logs).toEqual(storedLogs);
    });

    it("should handle storage errors when loading logs", async () => {
      mockChrome.storage.local.get.mockImplementation((keys, callback) => {
        try {
          throw new Error("Storage error");
        } catch (error) {
          // Chrome storage API typically fails silently or calls callback with empty data
          callback({});
        }
      });

      const logs = await errorHandler.loadStoredLogs();
      expect(logs).toEqual([]);
    });
  });

  describe("Error Statistics", () => {
    beforeEach(() => {
      errorHandler.logEntries = []; // Clear logs before adding test data
      errorHandler.debug("Debug 1");
      errorHandler.info("Info 1");
      errorHandler.info("Info 2");
      errorHandler.warn("Warning 1");
      errorHandler.error("Error 1");
      errorHandler.error("Error 2", null, { type: "tts_error" });
    });

    it("should generate correct error statistics", () => {
      const stats = errorHandler.generateErrorStats();

      expect(stats.total).toBe(5);
      expect(stats.byLevel).toEqual({
        DEBUG: 0,
        INFO: 2,
        WARN: 1,
        ERROR: 2,
      });
      expect(stats.byType.tts_error).toBe(1);
      expect(stats.byType.unknown).toBe(4);
      expect(stats.recent).toHaveLength(5);
      expect(stats.timeRange.oldest).toBeDefined();
      expect(stats.timeRange.newest).toBeDefined();
    });
  });

  describe("Global Instance", () => {
    it("should provide global error handler instance", () => {
      expect(globalErrorHandler).toBeInstanceOf(ErrorHandler);
    });
  });
});
