import { useLayoutEffect, useRef } from 'react';

export function useBackTrap(enable: boolean) {
  const armedRef = useRef(false);

  useLayoutEffect(() => {
    if (!enable) return;


    if (armedRef.current) return;
    armedRef.current = true;

    const href = window.location.href;

    window.history.replaceState({ trap: true }, '', href);
    window.history.pushState({ trap: true }, '', href);

    const onPopState = (e: PopStateEvent) => {
      if ((e.state && (e.state as any).trap) || !e.state) {
        window.history.pushState({ trap: true }, '', href);
        window.location.reload();
      }
    };

    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
      armedRef.current = false;
    };
  }, [enable]);
}