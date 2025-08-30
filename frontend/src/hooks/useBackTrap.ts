import { useEffect, useRef } from 'react';

type Options =
  | boolean
  | {
      hard?: boolean;
    };
export function useBackTrap(opts: Options = true) {
  const hard = typeof opts === 'boolean' ? opts : !!opts.hard;
  const armedRef = useRef(false);
  const removeRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!hard) return;

    if (!armedRef.current) {
      try {
        const st = window.history.state || {};
        window.history.pushState({ ...st, __back_trap: true }, '');
        armedRef.current = true;
      } catch {}
    }

    const onPop = (e: PopStateEvent) => {
      try {
        window.history.go(1);
      } catch {
        const st = (e.state ?? {}) as any;
        window.history.pushState({ ...st, __back_trap: true }, '');
      }
    };

    window.addEventListener('popstate', onPop);
    removeRef.current = () => window.removeEventListener('popstate', onPop);

    return () => {
      removeRef.current();
    };
  }, [hard]);

  return removeRef.current;
}