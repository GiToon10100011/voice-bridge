import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import PermissionsManager from "../../src/background/permissions-manager.js";

describe("PermissionsManager", () => {
  let permissionsManager;
  let mockChrome;

  beforeEach(() => {
    // Mock Chrome Extensions API
    mockChrome = {
      permissions: {
        contains: vi.fn(),
        request: vi.fn(),
        onAdded: {
          addListener: vi.fn(),
        },
        onRemoved: {
          addListener: vi.fn(),
        },
      },
      runtime: {
        lastError: null,
      },
    };

    global.chrome = mockChrome;
    permissionsManager = new PermissionsManager();
  });

  afterEach(() => {
    delete global.chrome;
  });

  describe("Constructor", () => {
    it("should initialize with correct default values", () => {
      expect(permissionsManager.requiredPermissions).toEqual([
        "storage",
        "notifications",
      ]);
      expect(permissionsManager.optionalPermissions).toEqual([]);
      expect(permissionsManager.permissionStatus).toBeInstanceOf(Map);
      expect(permissionsManager.errorHandlers).toBeInstanceOf(Map);
    });
  });

  describe("Error Handling", () => {
    it("should register error handlers correctly", () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      permissionsManager.onError("test_error", handler1);
      permissionsManager.onError("test_error", handler2);

      expect(permissionsManager.errorHandlers.get("test_error")).toHaveLength(
        2
      );
      expect(permissionsManager.errorHandlers.get("test_error")).toContain(
        handler1
      );
      expect(permissionsManager.errorHandlers.get("test_error")).toContain(
        handler2
      );
    });

    it("should handle errors and call registered handlers", () => {
      const handler = vi.fn();
      const error = new Error("Test error");
      const context = { test: "context" };

      permissionsManager.onError("test_error", handler);
      permissionsManager._handleError("test_error", error, context);

      expect(handler).toHaveBeenCalledWith(error, context);
    });

    it("should handle errors in error handlers gracefully", () => {
      const faultyHandler = vi.fn(() => {
        throw new Error("Handler error");
      });
      const goodHandler = vi.fn();
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      permissionsManager.onError("test_error", faultyHandler);
      permissionsManager.onError("test_error", goodHandler);

      permissionsManager._handleError("test_error", new Error("Test error"));

      expect(faultyHandler).toHaveBeenCalled();
      expect(goodHandler).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        "Error in permission error handler:",
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe("Extension Environment Detection", () => {
    it("should detect Chrome extension environment correctly", () => {
      expect(permissionsManager.isExtensionEnvironment()).toBe(true);
    });

    it("should return false when chrome is not available", () => {
      delete global.chrome;
      expect(permissionsManager.isExtensionEnvironment()).toBe(false);
    });

    it("should return false when chrome.permissions is not available", () => {
      delete global.chrome.permissions;
      const newManager = new PermissionsManager();
      expect(newManager.isExtensionEnvironment()).toBe(false);
    });

    it("should return false when chrome.permissions.request is not available", () => {
      delete global.chrome.permissions.request;
      expect(permissionsManager.isExtensionEnvironment()).toBe(false);
    });
  });

  describe("Permission Checking", () => {
    it("should check single permission successfully", async () => {
      mockChrome.permissions.contains.mockImplementation(
        (permissions, callback) => {
          callback(true);
        }
      );

      const result = await permissionsManager.checkPermission("storage");

      expect(result).toBe(true);
      expect(mockChrome.permissions.contains).toHaveBeenCalledWith(
        { permissions: ["storage"] },
        expect.any(Function)
      );
      expect(permissionsManager.getPermissionStatus("storage")).toBe(true);
    });

    it("should handle permission check failure", async () => {
      mockChrome.permissions.contains.mockImplementation(
        (permissions, callback) => {
          callback(false);
        }
      );

      const result = await permissionsManager.checkPermission("storage");

      expect(result).toBe(false);
      expect(permissionsManager.getPermissionStatus("storage")).toBe(false);
    });

    it("should handle Chrome API errors during permission check", async () => {
      mockChrome.permissions.contains.mockImplementation(
        (permissions, callback) => {
          mockChrome.runtime.lastError = { message: "API Error" };
          callback(false);
        }
      );

      const errorHandler = vi.fn();
      permissionsManager.onError("permission_api_error", errorHandler);

      const result = await permissionsManager.checkPermission("storage");

      expect(result).toBe(false);
      expect(errorHandler).toHaveBeenCalledWith(expect.any(Error), {
        permission: "storage",
      });
    });

    it("should check all required permissions", async () => {
      mockChrome.permissions.contains.mockImplementation(
        (permissions, callback) => {
          callback(true);
        }
      );

      const result = await permissionsManager.checkAllRequiredPermissions();

      expect(result).toBe(true);
      expect(mockChrome.permissions.contains).toHaveBeenCalledWith(
        { permissions: ["storage", "notifications"] },
        expect.any(Function)
      );
    });

    it("should return false when not in extension environment", async () => {
      delete global.chrome;

      const errorHandler = vi.fn();
      permissionsManager.onError("extension_api_unavailable", errorHandler);

      const result = await permissionsManager.checkAllRequiredPermissions();

      expect(result).toBe(false);
      expect(errorHandler).toHaveBeenCalled();
    });
  });

  describe("Permission Requesting", () => {
    it("should request single permission successfully", async () => {
      mockChrome.permissions.request.mockImplementation(
        (permissions, callback) => {
          callback(true);
        }
      );

      const result = await permissionsManager.requestPermission("storage");

      expect(result).toBe(true);
      expect(mockChrome.permissions.request).toHaveBeenCalledWith(
        { permissions: ["storage"] },
        expect.any(Function)
      );
      expect(permissionsManager.getPermissionStatus("storage")).toBe(true);
    });

    it("should handle permission denial", async () => {
      mockChrome.permissions.request.mockImplementation(
        (permissions, callback) => {
          callback(false);
        }
      );

      const errorHandler = vi.fn();
      permissionsManager.onError("permission_denied", errorHandler);

      const result = await permissionsManager.requestPermission("storage");

      expect(result).toBe(false);
      expect(errorHandler).toHaveBeenCalledWith(expect.any(Error), {
        permission: "storage",
      });
      expect(permissionsManager.getPermissionStatus("storage")).toBe(false);
    });

    it("should request all required permissions", async () => {
      mockChrome.permissions.request.mockImplementation(
        (permissions, callback) => {
          callback(true);
        }
      );

      const result = await permissionsManager.requestRequiredPermissions();

      expect(result).toBe(true);
      expect(mockChrome.permissions.request).toHaveBeenCalledWith(
        { permissions: ["storage", "notifications"] },
        expect.any(Function)
      );
    });

    it("should handle required permissions denial", async () => {
      mockChrome.permissions.request.mockImplementation(
        (permissions, callback) => {
          callback(false);
        }
      );

      const errorHandler = vi.fn();
      permissionsManager.onError("required_permissions_denied", errorHandler);

      const result = await permissionsManager.requestRequiredPermissions();

      expect(result).toBe(false);
      expect(errorHandler).toHaveBeenCalled();
    });

    it("should handle Chrome API errors during permission request", async () => {
      mockChrome.permissions.request.mockImplementation(
        (permissions, callback) => {
          mockChrome.runtime.lastError = { message: "Request failed" };
          callback(false);
        }
      );

      const errorHandler = vi.fn();
      permissionsManager.onError("permission_request_api_error", errorHandler);

      const result = await permissionsManager.requestPermission("storage");

      expect(result).toBe(false);
      expect(errorHandler).toHaveBeenCalled();
    });
  });

  describe("Permission Status Management", () => {
    it("should get permission status correctly", () => {
      permissionsManager.permissionStatus.set("storage", true);
      permissionsManager.permissionStatus.set("notifications", false);

      expect(permissionsManager.getPermissionStatus("storage")).toBe(true);
      expect(permissionsManager.getPermissionStatus("notifications")).toBe(false);
      expect(permissionsManager.getPermissionStatus("unknown")).toBeNull();
    });

    it("should get all permission status", () => {
      permissionsManager.permissionStatus.set("storage", true);
      permissionsManager.permissionStatus.set("notifications", false);

      const status = permissionsManager.getAllPermissionStatus();

      expect(status).toEqual({
        storage: true,
        notifications: false,
      });
    });
  });

  describe("Permission Guide Messages", () => {
    it("should generate permission guide message", () => {
      const missingPermissions = ["storage", "notifications"];
      const guide =
        permissionsManager.generatePermissionGuideMessage(missingPermissions);

      expect(guide.title).toBe("TTS Voice Bridge 권한 필요");
      expect(guide.permissions).toHaveLength(2);
      expect(guide.permissions[0].name).toBe("storage");
      expect(guide.permissions[0].description).toContain("스토리지 권한");
      expect(guide.permissions[1].name).toBe("notifications");
      expect(guide.permissions[1].description).toContain("알림 권한");
      expect(guide.instructions).toHaveLength(4);
    });

    it("should handle unknown permissions in guide message", () => {
      const missingPermissions = ["unknown_permission"];
      const guide =
        permissionsManager.generatePermissionGuideMessage(missingPermissions);

      expect(guide.permissions[0].description).toBe(
        "unknown_permission 권한이 필요합니다."
      );
    });
  });

  describe("Initialization", () => {
    it("should initialize successfully with all permissions", async () => {
      mockChrome.permissions.contains.mockImplementation(
        (permissions, callback) => {
          callback(true);
        }
      );

      const result = await permissionsManager.initialize();

      expect(result.success).toBe(true);
      expect(result.hasAllRequired).toBe(true);
      expect(result.missingPermissions).toEqual([]);
      expect(result.error).toBeNull();
    });

    it("should initialize with missing permissions", async () => {
      mockChrome.permissions.contains.mockImplementation(
        (permissions, callback) => {
          const permission = permissions.permissions[0];
          callback(permission !== "storage"); // storage permission missing
        }
      );

      const errorHandler = vi.fn();
      permissionsManager.onError("missing_required_permissions", errorHandler);

      const result = await permissionsManager.initialize();

      expect(result.success).toBe(true);
      expect(result.hasAllRequired).toBe(false);
      expect(result.missingPermissions).toContain("storage");
      expect(errorHandler).toHaveBeenCalled();
    });

    it("should handle initialization failure", async () => {
      delete global.chrome;

      const errorHandler = vi.fn();
      permissionsManager.onError("initialization_failed", errorHandler);

      const result = await permissionsManager.initialize();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Chrome Extensions API를 사용할 수 없습니다");
    });
  });

  describe("Permission Change Events", () => {
    it("should register permission change listeners", () => {
      const callback = vi.fn();

      permissionsManager.onPermissionChanged(callback);

      expect(mockChrome.permissions.onAdded.addListener).toHaveBeenCalled();
      expect(mockChrome.permissions.onRemoved.addListener).toHaveBeenCalled();
    });

    it("should handle permission added event", () => {
      const callback = vi.fn();
      permissionsManager.onPermissionChanged(callback);

      // Simulate permission added event
      const addedListener =
        mockChrome.permissions.onAdded.addListener.mock.calls[0][0];
      addedListener({ permissions: ["storage"] });

      expect(callback).toHaveBeenCalledWith({
        type: "added",
        permissions: { permissions: ["storage"] },
      });
      expect(permissionsManager.getPermissionStatus("storage")).toBe(true);
    });

    it("should handle permission removed event", () => {
      const callback = vi.fn();
      permissionsManager.onPermissionChanged(callback);

      // Simulate permission removed event
      const removedListener =
        mockChrome.permissions.onRemoved.addListener.mock.calls[0][0];
      removedListener({ permissions: ["storage"] });

      expect(callback).toHaveBeenCalledWith({
        type: "removed",
        permissions: { permissions: ["storage"] },
      });
      expect(permissionsManager.getPermissionStatus("storage")).toBe(false);
    });

    it("should not register listeners when not in extension environment", () => {
      delete global.chrome;
      const callback = vi.fn();

      expect(() =>
        permissionsManager.onPermissionChanged(callback)
      ).not.toThrow();
    });
  });

  describe("Edge Cases", () => {
    it("should handle missing onAdded listener", () => {
      delete mockChrome.permissions.onAdded;
      const callback = vi.fn();

      expect(() =>
        permissionsManager.onPermissionChanged(callback)
      ).not.toThrow();
    });

    it("should handle missing onRemoved listener", () => {
      delete mockChrome.permissions.onRemoved;
      const callback = vi.fn();

      expect(() =>
        permissionsManager.onPermissionChanged(callback)
      ).not.toThrow();
    });

    it("should handle permission events without permissions array", () => {
      const callback = vi.fn();
      permissionsManager.onPermissionChanged(callback);

      const addedListener =
        mockChrome.permissions.onAdded.addListener.mock.calls[0][0];
      addedListener({}); // No permissions array

      expect(callback).toHaveBeenCalledWith({
        type: "added",
        permissions: {},
      });
    });
  });
});
