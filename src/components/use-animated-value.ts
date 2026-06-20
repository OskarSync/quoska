/**
 * useAnimatedValue — smoothly animates a number toward its target value.
 *
 * Returns the current animated value, easing toward `target` over `duration` ms.
 */

"use client";

import { useState, useEffect, useRef } from "react";

export function useAnimatedValue(target: number, duration = 500): number {
  const [current, setCurrent] = useState(target);
  const prevTarget = useRef(target);

  useEffect(() => {
    if (prevTarget.current === target) return;

    const start = prevTarget.current;
    const diff = target - start;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(start + diff * eased));

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setCurrent(target);
        prevTarget.current = target;
      }
    };

    prevTarget.current = current;
    requestAnimationFrame(animate);
  }, [target, duration]); // eslint-disable-line react-hooks/exhaustive-deps

  return current;
}
