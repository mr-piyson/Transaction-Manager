'use client';

import { useCallback, useEffect, useState } from 'react';
import { ClipboardService, type ClipboardDiagnostics, type ClipboardResult, ClipboardErrorCode } from './clipboard';

export type UseClipboardResult = {
  copy: (text: string) => Promise<ClipboardResult>;
  read: () => Promise<ClipboardResult & { text?: string }>;
  lastResult: ClipboardResult | null;
  diagnose: ClipboardDiagnostics;
  canCopy: boolean;
};

export function useClipboard(): UseClipboardResult {
  const [lastResult, setLastResult] = useState<ClipboardResult | null>(null);
  const [diagnose, setDiagnose] = useState<ClipboardDiagnostics>(ClipboardService.diagnose);

  useEffect(() => {
    const onFocus = () => setDiagnose(ClipboardService.diagnose());
    const onVisibility = () => setDiagnose(ClipboardService.diagnose());

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    setDiagnose(ClipboardService.diagnose());

    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const canCopy = diagnose.focused && diagnose.visibilityState === 'visible' && ClipboardService.canUseClipboard();

  const copy = useCallback(async (text: string): Promise<ClipboardResult> => {
    const result = await ClipboardService.copy(text);
    setLastResult(result);
    return result;
  }, []);

  const read = useCallback(async (): Promise<ClipboardResult & { text?: string }> => {
    const result = await ClipboardService.read();
    setLastResult(result);
    return result;
  }, []);

  return { copy, read, lastResult, diagnose, canCopy };
}

export { ClipboardErrorCode };
export type { ClipboardResult };
