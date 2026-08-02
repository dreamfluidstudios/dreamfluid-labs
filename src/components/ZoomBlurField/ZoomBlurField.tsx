"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { classNames } from "@/utils/classNames";
import { useZoomBlurField } from "./hooks/useZoomBlurField";

// Radial zoom-blur peephole over the hero backdrop. Mirrors LensField's
// portal + fixed canvas shell; samples TileField and frames a soft circular
// aperture around the intro focus. Enable via ?backdrop=zoom (lazy-loaded).
export const ZoomBlurField = ({
  source,
  sourceDirtyRef,
  heroRef,
  focusRef,
  onActiveChange,
  underlay = false,
}: {
  source: RefObject<HTMLCanvasElement | null>;
  sourceDirtyRef?: RefObject<boolean>;
  heroRef: RefObject<HTMLElement | null>;
  focusRef: RefObject<HTMLElement | null>;
  onActiveChange?: (active: boolean) => void;
  underlay?: boolean;
}) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return createPortal(
    <ZoomBlurCanvas
      source={source}
      sourceDirtyRef={sourceDirtyRef}
      heroRef={heroRef}
      focusRef={focusRef}
      onActiveChange={onActiveChange}
      underlay={underlay}
    />,
    document.body,
  );
};

const ZoomBlurCanvas = ({
  source,
  sourceDirtyRef,
  heroRef,
  focusRef,
  onActiveChange,
  underlay,
}: {
  source: RefObject<HTMLCanvasElement | null>;
  sourceDirtyRef?: RefObject<boolean>;
  heroRef: RefObject<HTMLElement | null>;
  focusRef: RefObject<HTMLElement | null>;
  onActiveChange?: (active: boolean) => void;
  underlay: boolean;
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(false);
  const onActiveChangeRef = useRef(onActiveChange);
  onActiveChangeRef.current = onActiveChange;
  const handleActiveRef = useRef((active: boolean) => {
    onActiveChangeRef.current?.(active);
    if (!active) {
      setVisible(false);
      return;
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setVisible(true));
    });
  });

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useZoomBlurField(
    canvasRef,
    source,
    heroRef,
    focusRef,
    handleActiveRef.current,
    underlay,
    sourceDirtyRef,
  );

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={classNames(
        "pointer-events-none fixed inset-0 z-[1] h-full w-full",
        visible ? "opacity-100" : "opacity-0",
        !reduced && "transition-opacity duration-700 ease-out",
      )}
    />
  );
};
