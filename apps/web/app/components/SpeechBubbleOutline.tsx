"use client";

import { useEffect, useRef, useState } from "react";

type Size = { width: number; height: number };

export default function SpeechBubbleOutline() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState<Size | null>(null);

  useEffect(() => {
    const parent = svgRef.current?.parentElement;
    if (!parent) return;

    const updateSize = () => {
      const { width, height } = parent.getBoundingClientRect();
      setSize({ width, height });
    };
    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(parent);
    return () => observer.disconnect();
  }, []);

  const width = size?.width ?? 0;
  const height = size?.height ?? 0;
  const edge = 1.5;
  const radius = 30;
  const tailLeft = 42;
  const tailRight = 102;
  const tailTip = 50;
  const path = `M ${radius} ${edge}
    H ${width - radius}
    Q ${width - edge} ${edge} ${width - edge} ${radius}
    V ${height - radius}
    Q ${width - edge} ${height - edge} ${width - radius} ${height - edge}
    H ${tailRight}
    L ${tailTip} ${height + 23}
    Q ${tailLeft} ${height + 29} ${tailLeft} ${height + 18}
    V ${height - edge}
    H ${radius}
    Q ${edge} ${height - edge} ${edge} ${height - radius}
    V ${radius}
    Q ${edge} ${edge} ${radius} ${edge}
    Z`;

  return (
    <svg
      ref={svgRef}
      className="arcade-speech-outline"
      width={width}
      height={height + 31}
      viewBox={`0 0 ${width} ${height + 31}`}
      aria-hidden="true"
      focusable="false"
    >
      {size ? <path d={path} /> : null}
    </svg>
  );
}
