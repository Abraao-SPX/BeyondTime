import { useCallback, useEffect, useState } from 'react';

const HIGH_CONTRAST_STORAGE_KEY = 'beyondtime:high-contrast';

function readInitialHighContrast(): boolean {
  try {
    const saved = window.localStorage.getItem(HIGH_CONTRAST_STORAGE_KEY);
    if (saved !== null) {
      return saved === '1';
    }
  } catch {
    // Ignora falha de leitura no storage em modo restrito.
  }

  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-contrast: more)').matches;
  }

  return false;
}

/**
 * Gerencia o modo escuro e alto contraste WCAG 2.1 AAA com persistência em localStorage.
 */
export function useHighContrast() {
  const [highContrast, setHighContrast] = useState<boolean>(readInitialHighContrast);

  useEffect(() => {
    document.documentElement.classList.toggle('high-contrast', highContrast);
    try {
      window.localStorage.setItem(
        HIGH_CONTRAST_STORAGE_KEY,
        highContrast ? '1' : '0'
      );
    } catch {
      // Ignora falha de gravação no storage em modo restrito.
    }
  }, [highContrast]);

  const toggleHighContrast = useCallback(() => {
    setHighContrast((prev) => !prev);
  }, []);

  return { highContrast, toggleHighContrast };
}
