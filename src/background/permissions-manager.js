/**
 * Permissions Manager - 브라우저 권한 관리 시스템
 * 필요한 브라우저 권한 요청 및 관리
 */
class PermissionsManager {
  constructor() {
    this.requiredPermissions = ["storage", "activeTab", "notifications"];
    this.optionalPermissions = ["tabs"];
    this.permissionStatus = new Map();
    this.errorHandlers = new Map();
  }

  /**
   * 오류 핸들러 등록
   * @param {string} errorType - 오류 타입
   * @param {Function} handler - 오류 처리 함수
   */
  onError(errorType, handler) {
    if (!this.errorHandlers.has(errorType)) {
      this.errorHandlers.set(errorType, []);
    }
    this.errorHandlers.get(errorType).push(handler);
  }

  /**
   * 오류 발생 시 등록된 핸들러 실행
   * @param {string} errorType - 오류 타입
   * @param {Error} error - 오류 객체
   * @param {Object} context - 추가 컨텍스트 정보
   */
  _handleError(errorType, error, context = {}) {
    const handlers = this.errorHandlers.get(errorType) || [];
    handlers.forEach((handler) => {
      try {
        handler(error, context);
      } catch (handlerError) {
        console.error("Error in permission error handler:", handlerError);
      }
    });
  }

  /**
   * Chrome Extensions API 지원 여부 확인
   * @returns {boolean} 지원 여부
   */
  isExtensionEnvironment() {
    return !!(
      typeof chrome !== "undefined" &&
      chrome.permissions &&
      typeof chrome.permissions.request === "function"
    );
  }

  /**
   * 모든 필수 권한 확인
   * @returns {Promise<boolean>} 모든 필수 권한이 있는지 여부
   */
  async checkAllRequiredPermissions() {
    if (!this.isExtensionEnvironment()) {
      const error = new Error("Chrome Extensions API를 사용할 수 없습니다");
      this._handleError("extension_api_unavailable", error);
      return false;
    }

    try {
      const hasAllPermissions = await this._checkPermissions(
        this.requiredPermissions
      );

      // 권한 상태 캐시 업데이트
      for (const permission of this.requiredPermissions) {
        const hasPermission = await this._checkSinglePermission(permission);
        this.permissionStatus.set(permission, hasPermission);
      }

      return hasAllPermissions;
    } catch (error) {
      this._handleError("permission_check_failed", error, {
        permissions: this.requiredPermissions,
      });
      return false;
    }
  }

  /**
   * 특정 권한 확인
   * @param {string} permission - 확인할 권한
   * @returns {Promise<boolean>} 권한 보유 여부
   */
  async checkPermission(permission) {
    if (!this.isExtensionEnvironment()) {
      this.permissionStatus.set(permission, false);
      return false;
    }

    try {
      const hasPermission = await this._checkSinglePermission(permission);
      this.permissionStatus.set(permission, hasPermission);
      return hasPermission;
    } catch (error) {
      this._handleError("single_permission_check_failed", error, {
        permission,
      });
      this.permissionStatus.set(permission, false);
      return false;
    }
  }

  /**
   * 단일 권한 확인 (내부 메서드)
   * @param {string} permission - 확인할 권한
   * @returns {Promise<boolean>} 권한 보유 여부
   */
  _checkSinglePermission(permission) {
    return new Promise((resolve) => {
      chrome.permissions.contains(
        {
          permissions: [permission],
        },
        (result) => {
          if (chrome.runtime.lastError) {
            this._handleError(
              "permission_api_error",
              new Error(chrome.runtime.lastError.message),
              { permission }
            );
            resolve(false);
          } else {
            resolve(result);
          }
        }
      );
    });
  }

  /**
   * 여러 권한 확인 (내부 메서드)
   * @param {string[]} permissions - 확인할 권한 목록
   * @returns {Promise<boolean>} 모든 권한 보유 여부
   */
  _checkPermissions(permissions) {
    return new Promise((resolve) => {
      chrome.permissions.contains(
        {
          permissions: permissions,
        },
        (result) => {
          if (chrome.runtime.lastError) {
            this._handleError(
              "permissions_api_error",
              new Error(chrome.runtime.lastError.message),
              { permissions }
            );
            resolve(false);
          } else {
            resolve(result);
          }
        }
      );
    });
  }

  /**
   * 필수 권한 요청
   * @returns {Promise<boolean>} 권한 요청 성공 여부
   */
  async requestRequiredPermissions() {
    if (!this.isExtensionEnvironment()) {
      const error = new Error("Chrome Extensions API를 사용할 수 없습니다");
      this._handleError("extension_api_unavailable", error);
      return false;
    }

    try {
      const granted = await this._requestPermissions(this.requiredPermissions);

      if (granted) {
        // 권한 상태 업데이트
        for (const permission of this.requiredPermissions) {
          this.permissionStatus.set(permission, true);
        }
        return true;
      } else {
        const error = new Error("사용자가 필수 권한을 거부했습니다");
        this._handleError("required_permissions_denied", error, {
          permissions: this.requiredPermissions,
        });
        return false;
      }
    } catch (error) {
      this._handleError("permission_request_failed", error, {
        permissions: this.requiredPermissions,
      });
      return false;
    }
  }

  /**
   * 특정 권한 요청
   * @param {string} permission - 요청할 권한
   * @returns {Promise<boolean>} 권한 요청 성공 여부
   */
  async requestPermission(permission) {
    if (!this.isExtensionEnvironment()) {
      return false;
    }

    try {
      const granted = await this._requestPermissions([permission]);
      this.permissionStatus.set(permission, granted);

      if (!granted) {
        this._handleError(
          "permission_denied",
          new Error(`권한이 거부되었습니다: ${permission}`),
          { permission }
        );
      }

      return granted;
    } catch (error) {
      this._handleError("single_permission_request_failed", error, {
        permission,
      });
      return false;
    }
  }

  /**
   * 권한 요청 (내부 메서드)
   * @param {string[]} permissions - 요청할 권한 목록
   * @returns {Promise<boolean>} 권한 요청 성공 여부
   */
  _requestPermissions(permissions) {
    return new Promise((resolve) => {
      chrome.permissions.request(
        {
          permissions: permissions,
        },
        (granted) => {
          if (chrome.runtime.lastError) {
            this._handleError(
              "permission_request_api_error",
              new Error(chrome.runtime.lastError.message),
              { permissions }
            );
            resolve(false);
          } else {
            resolve(granted);
          }
        }
      );
    });
  }

  /**
   * 권한 상태 가져오기
   * @param {string} permission - 권한 이름
   * @returns {boolean|null} 권한 상태 (null: 미확인)
   */
  getPermissionStatus(permission) {
    const status = this.permissionStatus.get(permission);
    return status !== undefined ? status : null;
  }

  /**
   * 모든 권한 상태 가져오기
   * @returns {Object} 권한 상태 객체
   */
  getAllPermissionStatus() {
    const status = {};
    for (const [permission, hasPermission] of this.permissionStatus) {
      status[permission] = hasPermission;
    }
    return status;
  }

  /**
   * 권한 부족 시 사용자 안내 메시지 생성
   * @param {string[]} missingPermissions - 부족한 권한 목록
   * @returns {Object} 안내 메시지 객체
   */
  generatePermissionGuideMessage(missingPermissions) {
    const messages = {
      storage: "설정을 저장하기 위해 스토리지 권한이 필요합니다.",
      activeTab: "현재 탭에서 작동하기 위해 활성 탭 권한이 필요합니다.",
      notifications: "알림을 표시하기 위해 알림 권한이 필요합니다.",
      tabs: "탭 정보에 접근하기 위해 탭 권한이 필요합니다.",
    };

    const guide = {
      title: "TTS Voice Bridge 권한 필요",
      description:
        "확장프로그램이 정상적으로 작동하려면 다음 권한이 필요합니다:",
      permissions: missingPermissions.map((permission) => ({
        name: permission,
        description: messages[permission] || `${permission} 권한이 필요합니다.`,
      })),
      instructions: [
        "1. 확장프로그램 아이콘을 우클릭하세요",
        '2. "확장프로그램 관리"를 선택하세요',
        '3. TTS Voice Bridge를 찾아 "세부정보"를 클릭하세요',
        '4. "권한" 섹션에서 필요한 권한을 활성화하세요',
      ],
      fallbackMessage: "권한을 수동으로 활성화한 후 페이지를 새로고침해주세요.",
    };

    return guide;
  }

  /**
   * 권한 상태 초기화 및 확인
   * @returns {Promise<Object>} 초기화 결과
   */
  async initialize() {
    const result = {
      success: false,
      hasAllRequired: false,
      missingPermissions: [],
      error: null,
    };

    try {
      if (!this.isExtensionEnvironment()) {
        result.error = "Chrome Extensions API를 사용할 수 없습니다";
        return result;
      }

      // 모든 권한 상태 확인
      const allPermissions = [
        ...this.requiredPermissions,
        ...this.optionalPermissions,
      ];
      const missingPermissions = [];

      for (const permission of allPermissions) {
        const hasPermission = await this.checkPermission(permission);
        if (!hasPermission && this.requiredPermissions.includes(permission)) {
          missingPermissions.push(permission);
        }
      }

      result.success = true;
      result.hasAllRequired = missingPermissions.length === 0;
      result.missingPermissions = missingPermissions;

      if (!result.hasAllRequired) {
        this._handleError(
          "missing_required_permissions",
          new Error("필수 권한이 부족합니다"),
          { missingPermissions }
        );
      }

      return result;
    } catch (error) {
      result.error = error.message;
      this._handleError("initialization_failed", error);
      return result;
    }
  }

  /**
   * 권한 변경 이벤트 리스너 등록
   * @param {Function} callback - 권한 변경 시 호출될 콜백
   */
  onPermissionChanged(callback) {
    if (!this.isExtensionEnvironment()) {
      return;
    }

    if (chrome.permissions.onAdded) {
      chrome.permissions.onAdded.addListener((permissions) => {
        // 권한 상태 업데이트
        if (permissions.permissions) {
          permissions.permissions.forEach((permission) => {
            this.permissionStatus.set(permission, true);
          });
        }
        callback({ type: "added", permissions });
      });
    }

    if (chrome.permissions.onRemoved) {
      chrome.permissions.onRemoved.addListener((permissions) => {
        // 권한 상태 업데이트
        if (permissions.permissions) {
          permissions.permissions.forEach((permission) => {
            this.permissionStatus.set(permission, false);
          });
        }
        callback({ type: "removed", permissions });
      });
    }
  }
}

// 모듈 내보내기 (브라우저 환경에서 사용)
if (typeof module !== "undefined" && module.exports) {
  module.exports = PermissionsManager;
} else {
  window.PermissionsManager = PermissionsManager;
}
