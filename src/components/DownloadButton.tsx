import { useCallback } from 'react';

interface Props {
  /** CSS selector or ref callback to locate the element to capture */
  targetSelector?: string;
  /** Direct ref to the SVG element */
  svgRef?: React.RefObject<SVGSVGElement | null>;
  /** Filename without extension */
  filename: string;
  /** Label for accessibility */
  label: string;
  /** Extra class */
  className?: string;
}

/**
 * Small download icon button that exports a DOM element or SVG to PNG.
 */
export default function DownloadButton({
  targetSelector,
  svgRef,
  filename,
  label,
  className = '',
}: Props) {
  const handleDownload = useCallback(async () => {
    try {
      if (svgRef?.current) {
        await downloadSvgAsPng(svgRef.current, filename);
      } else if (targetSelector) {
        const el = document.querySelector(targetSelector);
        if (!el) return;
        const html2canvas = (await import('html2canvas')).default;
        const canvas = await html2canvas(el as HTMLElement, {
          backgroundColor: '#fafaf9',
          scale: 2,
          useCORS: true,
        });
        triggerDownload(canvas, filename);
      }
    } catch (err) {
      console.error('Download failed:', err);
    }
  }, [targetSelector, svgRef, filename]);

  return (
    <button
      className={`download-btn ${className}`}
      onClick={handleDownload}
      aria-label={label}
      title={label}
      type="button"
    >
      {/* Download icon — small arrow-down into tray */}
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M8 1.5v9m0 0L4.5 7m3.5 3.5L11.5 7M2.5 13h11"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

/** Serialise an SVG element to a PNG and trigger download */
async function downloadSvgAsPng(svgEl: SVGSVGElement, filename: string) {
  const clone = svgEl.cloneNode(true) as SVGSVGElement;

  // Inline computed styles into the clone so the exported image looks correct
  inlineStyles(svgEl, clone);

  const viewBox = svgEl.getAttribute('viewBox') || '0 0 800 600';
  const [, , vbW, vbH] = viewBox.split(' ').map(Number);
  const scale = 2;
  const w = vbW * scale;
  const h = vbH * scale;

  clone.setAttribute('width', String(w));
  clone.setAttribute('height', String(h));
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

  // Add a white background rect
  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bg.setAttribute('width', '100%');
  bg.setAttribute('height', '100%');
  bg.setAttribute('fill', '#fafaf9');
  clone.insertBefore(bg, clone.firstChild);

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clone);
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0, w, h);
    URL.revokeObjectURL(url);
    triggerDownload(canvas, filename);
  };
  img.src = url;
}

/** Walk the DOM tree and inline computed styles onto the clone */
function inlineStyles(source: Element, target: Element) {
  const computed = window.getComputedStyle(source);
  const important = [
    'font-family', 'font-size', 'font-weight', 'font-style',
    'fill', 'stroke', 'stroke-width', 'opacity', 'color',
    'text-anchor', 'dominant-baseline', 'letter-spacing',
    'text-transform',
  ];
  for (const prop of important) {
    (target as HTMLElement).style.setProperty(prop, computed.getPropertyValue(prop));
  }
  const sourceChildren = source.children;
  const targetChildren = target.children;
  for (let i = 0; i < sourceChildren.length; i++) {
    if (targetChildren[i]) {
      inlineStyles(sourceChildren[i], targetChildren[i]);
    }
  }
}

/** Trigger a browser download from a canvas */
function triggerDownload(canvas: HTMLCanvasElement, filename: string) {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 'image/png');
}
