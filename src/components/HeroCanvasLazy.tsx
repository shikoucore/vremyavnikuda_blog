import { useEffect, useRef, useState } from 'react';
import type { ComponentType } from 'react';

export default function HeroCanvasLazy() {
  const [HeroCanvas, setHeroCanvas] = useState<ComponentType | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) {
      setShouldLoad(true);
      return;
    }

    if (!('IntersectionObserver' in window)) {
      setShouldLoad(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some(entry => entry.isIntersecting)) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px 0px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!shouldLoad) return;

    let cancelled = false;
    import('./HeroCanvas')
      .then(mod => {
        if (!cancelled) setHeroCanvas(() => mod.default);
      })
      .catch(() => {
        // Ignore load failures to avoid breaking page rendering.
      });

    return () => {
      cancelled = true;
    };
  }, [shouldLoad]);

  return (
    <>
      <div ref={sentinelRef} className="absolute inset-0 pointer-events-none" aria-hidden="true" />
      {HeroCanvas ? <HeroCanvas /> : null}
    </>
  );
}
