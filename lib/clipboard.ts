export enum ClipboardErrorCode {
  SUCCESS = 'SUCCESS',
  NOT_SUPPORTED = 'NOT_SUPPORTED',
  INSECURE_CONTEXT = 'INSECURE_CONTEXT',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  PERMISSION_PROMPT = 'PERMISSION_PROMPT',
  USER_GESTURE_REQUIRED = 'USER_GESTURE_REQUIRED',
  DOCUMENT_NOT_FOCUSED = 'DOCUMENT_NOT_FOCUSED',
  DOCUMENT_HIDDEN = 'DOCUMENT_HIDDEN',
  FALLBACK_FAILED = 'FALLBACK_FAILED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface ClipboardResult {
  success: boolean;
  code: ClipboardErrorCode;
  message: string;
}

export interface ClipboardDiagnostics {
  secureContext: boolean;
  clipboardApiSupported: boolean;
  permissionsApiSupported: boolean;
  permissionState: PermissionState | 'unsupported' | 'unknown';
  browser: string;
  protocol: string;
  hostname: string;
  origin: string;
  focused: boolean;
  visibilityState: DocumentVisibilityState;
  canUserGesture: boolean;
  recommendedFix: string;
}

let debugEnabled = false;

export function enableClipboardDebug(enable: boolean) {
  debugEnabled = enable;
}

function debug(...args: unknown[]) {
  if (debugEnabled) {
    console.log('[ClipboardService]', ...args);
  }
}

function getBrowser(): string {
  if (typeof navigator === 'undefined') return 'server';
  const ua = navigator.userAgent;
  if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
  if (ua.includes('Edg')) return 'Edge';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
  return 'Unknown';
}

function isLocalhost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}



function classifyClipboardError(error: unknown, context: { secureContext: boolean }): ClipboardResult {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (context.secureContext === false) {
    return {
      success: false,
      code: ClipboardErrorCode.INSECURE_CONTEXT,
      message: 'Clipboard access requires a secure connection (HTTPS or localhost). This page is served over an insecure connection.',
    };
  }

  if (lower.includes('denied') || lower.includes('permission')) {
    return {
      success: false,
      code: ClipboardErrorCode.PERMISSION_DENIED,
      message: 'Clipboard permission was denied. Check your browser settings.',
    };
  }

  if (lower.includes('not focused') || lower.includes('no focus')) {
    return {
      success: false,
      code: ClipboardErrorCode.DOCUMENT_NOT_FOCUSED,
      message: 'Page must be focused to copy to clipboard.',
    };
  }

  if (lower.includes('hidden')) {
    return {
      success: false,
      code: ClipboardErrorCode.DOCUMENT_HIDDEN,
      message: 'Page is hidden. Bring the tab into view to copy.',
    };
  }

  if (lower.includes('not supported') || lower.includes('not available') || lower.includes('undefined')) {
    return {
      success: false,
      code: ClipboardErrorCode.NOT_SUPPORTED,
      message: 'Clipboard API is not supported in this browser.',
    };
  }

  return {
    success: false,
    code: ClipboardErrorCode.UNKNOWN_ERROR,
    message: message || 'An unknown clipboard error occurred.',
  };
}

const IN_MEMORY_CLIPBOARD: { text: string | null } = { text: null };

function fallbackCopy(text: string): boolean {
  try {
    const el = document.createElement('textarea');
    el.value = text;
    el.style.position = 'fixed';
    el.style.left = '-9999px';
    el.style.top = '-9999px';
    el.style.width = '1px';
    el.style.height = '1px';
    el.readOnly = true;
    document.body.appendChild(el);
    el.focus();
    el.select();
    el.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    if (ok) {
      IN_MEMORY_CLIPBOARD.text = text;
    }
    return ok;
  } catch {
    return false;
  }
}

export const ClipboardService = {
  copy: async (text: string): Promise<ClipboardResult> => {
    const diagnostics = ClipboardService.diagnose();
    debug('copy called with diagnostics:', diagnostics);

    if (diagnostics.clipboardApiSupported && diagnostics.secureContext) {
      try {
        await navigator.clipboard.writeText(text);
        IN_MEMORY_CLIPBOARD.text = text;
        debug('clipboard API copy succeeded');
        return {
          success: true,
          code: ClipboardErrorCode.SUCCESS,
          message: 'Copied to clipboard.',
        };
      } catch (error) {
        debug('clipboard API copy failed:', error);
        if (!diagnostics.focused) {
          return {
            success: false,
            code: ClipboardErrorCode.DOCUMENT_NOT_FOCUSED,
            message: 'Page is not focused. Click on the page and try again.',
          };
        }
        return classifyClipboardError(error, { secureContext: diagnostics.secureContext });
      }
    }

    if (!diagnostics.focused) {
      return {
        success: false,
        code: ClipboardErrorCode.DOCUMENT_NOT_FOCUSED,
        message: 'Page is not focused. Click on the page and try again.',
      };
    }

    debug('trying execCommand fallback');
    const fallbackOk = fallbackCopy(text);
    if (fallbackOk) {
      debug('execCommand fallback succeeded');
      return {
        success: true,
        code: ClipboardErrorCode.SUCCESS,
        message: 'Copied to clipboard.',
      };
    }

    debug('all copy methods failed');
    if (!diagnostics.secureContext) {
      return {
        success: false,
        code: ClipboardErrorCode.INSECURE_CONTEXT,
        message: 'Cannot copy to clipboard over an insecure connection (HTTP). Use HTTPS or access via localhost.',
      };
    }

    return {
      success: false,
      code: ClipboardErrorCode.NOT_SUPPORTED,
      message: 'Clipboard is not available in this browser or context.',
    };
  },

  read: async (): Promise<ClipboardResult & { text?: string }> => {
    const diagnostics = ClipboardService.diagnose();

    if (!diagnostics.clipboardApiSupported || !diagnostics.secureContext) {
      const fallback = IN_MEMORY_CLIPBOARD.text;
      if (fallback !== null) {
        return {
          success: true,
          code: ClipboardErrorCode.SUCCESS,
          message: 'Read from in-memory clipboard.',
          text: fallback,
        };
      }
      return {
        success: false,
        code: ClipboardErrorCode.NOT_SUPPORTED,
        message: 'Clipboard read requires a secure context and is not available on this connection.',
      };
    }

    try {
      const text = await navigator.clipboard.readText();
      return {
        success: true,
        code: ClipboardErrorCode.SUCCESS,
        message: 'Read from clipboard.',
        text,
      };
    } catch (error) {
      debug('clipboard read failed:', error);
      const classified = classifyClipboardError(error, { secureContext: diagnostics.secureContext });
      return classified;
    }
  },

  diagnose: (): ClipboardDiagnostics => {
    if (typeof window === 'undefined') {
      return {
        secureContext: false,
        clipboardApiSupported: false,
        permissionsApiSupported: false,
        permissionState: 'unsupported',
        browser: 'server',
        protocol: 'server',
        hostname: 'server',
        origin: 'server',
        focused: false,
        visibilityState: 'hidden',
        canUserGesture: false,
        recommendedFix: 'Cannot access clipboard from server-side rendering.',
      };
    }

    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const origin = window.location.origin;
    const secureContext = window.isSecureContext;
    const focused = document.hasFocus();
    const visibilityState = document.visibilityState;
    const clipboardApiSupported = !!navigator.clipboard;
    const permissionsApiSupported = !!navigator.permissions;
    const browser = getBrowser();
    const localhost = isLocalhost(hostname);
    const https = protocol === 'https:';

    let recommendedFix: string;
    if (secureContext) {
      recommendedFix = 'Your connection is secure. Clipboard should work normally.';
    } else if (localhost) {
      recommendedFix = 'localhost is treated as a secure context. Clipboard should work.';
    } else if (https) {
      recommendedFix = 'HTTPS should be a secure context. Check for mixed content or iframe issues.';
    } else {
      recommendedFix = 'Clipboard access requires a secure context. Use HTTPS instead of HTTP, or access via localhost. Browser security policies intentionally block clipboard access on insecure origins and this cannot be overridden by JavaScript.';
    }

    return {
      secureContext,
      clipboardApiSupported,
      permissionsApiSupported,
      permissionState: 'unknown',
      browser,
      protocol,
      hostname,
      origin,
      focused,
      visibilityState,
      canUserGesture: focused && visibilityState === 'visible' && !!(navigator.clipboard || document.queryCommandSupported?.('copy')),
      recommendedFix,
    };
  },

  canUseClipboard: (): boolean => {
    if (typeof window === 'undefined') return false;
    if (window.isSecureContext && !!navigator.clipboard) return true;
    if (isLocalhost(window.location.hostname) && !!navigator.clipboard) return true;
    try {
      return document.queryCommandSupported?.('copy') ?? false;
    } catch {
      return false;
    }
  },
};
