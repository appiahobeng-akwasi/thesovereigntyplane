import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { usePlaneStore } from '../stores/plane';
import { filterByScope } from '../lib/countries';
import type { Country } from '../data/types';

// ─── 3D projection helpers ───────────────────────────────────────────────────

const PERSPECTIVE = 600;

function project3D(
  x: number, y: number, z: number,
  rotX: number, rotY: number,
  scale: number, cx: number, cy: number,
): { sx: number; sy: number; depth: number } {
  // Y-axis rotation (yaw)
  const cosY = Math.cos(rotY);
  const sinY = Math.sin(rotY);
  let x1 = x * cosY - z * sinY;
  const z1 = x * sinY + z * cosY;
  const y1 = y;

  // X-axis rotation (pitch)
  const cosX = Math.cos(rotX);
  const sinX = Math.sin(rotX);
  const y2 = y1 * cosX - z1 * sinX;
  const z2 = y1 * sinX + z1 * cosX;
  x1 = x1; // x unchanged by X rotation

  // Perspective
  const pScale = PERSPECTIVE / (PERSPECTIVE + z2);
  const sx = cx + x1 * scale * pScale;
  const sy = cy - y2 * scale * pScale;

  return { sx, sy, depth: z2 };
}

function isPointInQuad(
  px: number, py: number,
  p0: { sx: number; sy: number },
  p1: { sx: number; sy: number },
  p2: { sx: number; sy: number },
  p3: { sx: number; sy: number },
): boolean {
  const pts = [p0, p1, p2, p3];
  let inside = false;
  for (let i = 0, j = 3; i < 4; j = i++) {
    const xi = pts[i].sx, yi = pts[i].sy;
    const xj = pts[j].sx, yj = pts[j].sy;
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

// ─── Quadrant definitions ────────────────────────────────────────────────────

const QUADRANTS = [
  {
    key: 'theatre',
    label: 'Sovereignty\nTheatre',
    xMin: 0, xMax: 0.5, yMin: 0.5, yMax: 1,
    baseColor: [230, 150, 150, 0.25] as [number, number, number, number],
    hoverColor: [230, 150, 150, 0.5] as [number, number, number, number],
    labelColor: 'rgba(230, 150, 150, 0.9)',
  },
  {
    key: 'interdep',
    label: 'Negotiated\nInterdependence',
    xMin: 0.5, xMax: 1, yMin: 0.5, yMax: 1,
    baseColor: [150, 180, 220, 0.25] as [number, number, number, number],
    hoverColor: [150, 180, 220, 0.5] as [number, number, number, number],
    labelColor: 'rgba(150, 180, 220, 0.9)',
  },
  {
    key: 'depend',
    label: 'Dependency\nby Default',
    xMin: 0, xMax: 0.5, yMin: 0, yMax: 0.5,
    baseColor: [200, 160, 120, 0.2] as [number, number, number, number],
    hoverColor: [200, 160, 120, 0.45] as [number, number, number, number],
    labelColor: 'rgba(200, 160, 120, 0.9)',
  },
  {
    key: 'adhoc',
    label: 'At the Capability\nFrontier',
    xMin: 0.5, xMax: 1, yMin: 0, yMax: 0.5,
    baseColor: [150, 200, 180, 0.25] as [number, number, number, number],
    hoverColor: [150, 200, 180, 0.5] as [number, number, number, number],
    labelColor: 'rgba(150, 200, 180, 0.9)',
  },
];

// ─── Country flag lookup ─────────────────────────────────────────────────────

function isoToFlag(iso: string): string {
  if (iso.length !== 3) return '';
  const alpha2Map: Record<string, string> = {
    SEN: 'SN', EGY: 'EG', MAR: 'MA', RWA: 'RW', NGA: 'NG',
    KEN: 'KE', GHA: 'GH', BWA: 'BW', ETH: 'ET', CMR: 'CM',
    GAB: 'GA', MWI: 'MW', SLE: 'SL', ZAF: 'ZA', TUN: 'TN',
    FRA: 'FR', JPN: 'JP', ARE: 'AE', BRA: 'BR',
    IND: 'IN', SGP: 'SG', IDN: 'ID',
  };
  const a2 = alpha2Map[iso];
  if (!a2) return '';
  return String.fromCodePoint(...[...a2].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
}

// ─── Main component ──────────────────────────────────────────────────────────

interface Plane3DProps {
  countries: Country[];
}

export default function Plane3D({ countries }: Plane3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scope = usePlaneStore((s) => s.scope);
  const view = usePlaneStore((s) => s.view);
  const toggleSelected = usePlaneStore((s) => s.toggleSelected);
  const selected = usePlaneStore((s) => s.selected);

  const data = useMemo(() => filterByScope(countries, scope), [countries, scope]);

  const [rotateX, setRotateX] = useState(-0.4);
  const [rotateY, setRotateY] = useState(0.3);
  const [isDragging, setIsDragging] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
  const [mousePos, setMousePos] = useState({ x: -999, y: -999 });
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [hoveredQuadrant, setHoveredQuadrant] = useState<string | null>(null);

  // ─── Mouse handlers ──────────────────────────────────────────────────

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setLastPos({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });

    if (isDragging) {
      const dx = e.clientX - lastPos.x;
      const dy = e.clientY - lastPos.y;
      setRotateY(prev => prev + dx * 0.008);
      setRotateX(prev => Math.max(-Math.PI / 1.5, Math.min(Math.PI / 1.5, prev - dy * 0.008)));
      setLastPos({ x: e.clientX, y: e.clientY });
    }
  }, [isDragging, lastPos]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setRotateX(prev => Math.max(-Math.PI / 1.5, Math.min(Math.PI / 1.5, prev - e.deltaY * 0.0008)));
  }, []);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (hoveredCountry) {
      const country = data.find(c => c.iso_code === hoveredCountry);
      if (country) toggleSelected(country);
    }
  }, [hoveredCountry, data, toggleSelected]);

  // ─── Render loop ─────────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize canvas
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;
    const scale = Math.min(W, H) * 0.08;

    // ── 1. Background gradient ──
    const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.7);
    bgGrad.addColorStop(0, '#2B3A42');
    bgGrad.addColorStop(0.5, '#1E2A32');
    bgGrad.addColorStop(1, '#0F1519');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // ── 2. Atmospheric layers ──
    for (const [opacity, size] of [[0.08, 0.5], [0.06, 0.35], [0.04, 0.2]] as [number, number][]) {
      const atmo = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * size);
      atmo.addColorStop(0, `rgba(100, 140, 160, ${opacity})`);
      atmo.addColorStop(1, 'rgba(100, 140, 160, 0)');
      ctx.fillStyle = atmo;
      ctx.fillRect(0, 0, W, H);
    }

    // ── 3. Helper: draw quadrant surface ──
    let detectedQuadrant: string | null = null;

    function drawQuadrant(
      q: typeof QUADRANTS[0],
      isHovered: boolean,
    ) {
      const gridN = 20;
      const [r, g, b, a] = isHovered ? q.hoverColor : q.baseColor;

      for (let i = 0; i < gridN; i++) {
        for (let j = 0; j < gridN; j++) {
          const u0 = q.xMin + (i / gridN) * (q.xMax - q.xMin);
          const u1 = q.xMin + ((i + 1) / gridN) * (q.xMax - q.xMin);
          const v0 = q.yMin + (j / gridN) * (q.yMax - q.yMin);
          const v1 = q.yMin + ((j + 1) / gridN) * (q.yMax - q.yMin);

          // Map 0-1 to -5..5
          const x0 = u0 * 10 - 5, x1 = u1 * 10 - 5;
          const y0 = v0 * 10 - 5, y1 = v1 * 10 - 5;

          const p00 = project3D(x0, 0, -y0, rotateX, rotateY, scale, cx, cy);
          const p10 = project3D(x1, 0, -y0, rotateX, rotateY, scale, cx, cy);
          const p11 = project3D(x1, 0, -y1, rotateX, rotateY, scale, cx, cy);
          const p01 = project3D(x0, 0, -y1, rotateX, rotateY, scale, cx, cy);

          ctx.beginPath();
          ctx.moveTo(p00.sx, p00.sy);
          ctx.lineTo(p10.sx, p10.sy);
          ctx.lineTo(p11.sx, p11.sy);
          ctx.lineTo(p01.sx, p01.sy);
          ctx.closePath();
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a})`;
          ctx.fill();
        }
      }

      // Hit test for quadrant hover
      const corners = [
        project3D(q.xMin * 10 - 5, 0, -(q.yMin * 10 - 5), rotateX, rotateY, scale, cx, cy),
        project3D(q.xMax * 10 - 5, 0, -(q.yMin * 10 - 5), rotateX, rotateY, scale, cx, cy),
        project3D(q.xMax * 10 - 5, 0, -(q.yMax * 10 - 5), rotateX, rotateY, scale, cx, cy),
        project3D(q.xMin * 10 - 5, 0, -(q.yMax * 10 - 5), rotateX, rotateY, scale, cx, cy),
      ];
      if (isPointInQuad(mousePos.x, mousePos.y, corners[0], corners[1], corners[2], corners[3])) {
        detectedQuadrant = q.key;
      }
    }

    // ── 4. Draw quadrants ──
    for (const q of QUADRANTS) {
      drawQuadrant(q, hoveredQuadrant === q.key);
    }

    // ── 5. Coherence line (x = y diagonal) ──
    ctx.setLineDash([8, 4]);
    ctx.strokeStyle = 'rgba(255, 200, 100, 0.5)';
    ctx.lineWidth = 2;
    const segments = 40;
    ctx.beginPath();
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const val = t * 10 - 5;
      const p = project3D(val, 0, -val, rotateX, rotateY, scale, cx, cy);
      if (i === 0) ctx.moveTo(p.sx, p.sy);
      else ctx.lineTo(p.sx, p.sy);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // ── 6. Center axes ──
    ctx.strokeStyle = 'rgba(120, 140, 150, 0.4)';
    ctx.lineWidth = 2;
    // Vertical (x = 0.5)
    const axVTop = project3D(0, 0, -5, rotateX, rotateY, scale, cx, cy);
    const axVBot = project3D(0, 0, 5, rotateX, rotateY, scale, cx, cy);
    ctx.beginPath();
    ctx.moveTo(axVTop.sx, axVTop.sy);
    ctx.lineTo(axVBot.sx, axVBot.sy);
    ctx.stroke();
    // Horizontal (y = 0.5)
    const axHLeft = project3D(-5, 0, 0, rotateX, rotateY, scale, cx, cy);
    const axHRight = project3D(5, 0, 0, rotateX, rotateY, scale, cx, cy);
    ctx.beginPath();
    ctx.moveTo(axHLeft.sx, axHLeft.sy);
    ctx.lineTo(axHRight.sx, axHRight.sy);
    ctx.stroke();

    // ── 7. Axis labels ──
    ctx.font = '12px sans-serif';
    ctx.fillStyle = 'rgba(200, 200, 200, 0.8)';
    const xLabelPos = project3D(6, 0, 5.5, rotateX, rotateY, scale, cx, cy);
    ctx.fillText('SUBSTANTIVE SOVEREIGNTY →', xLabelPos.sx, xLabelPos.sy);
    const yLabelPos = project3D(-5.5, 0, -4, rotateX, rotateY, scale, cx, cy);
    ctx.save();
    ctx.translate(yLabelPos.sx, yLabelPos.sy);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('FORMAL SOVEREIGNTY →', 0, 0);
    ctx.restore();

    // ── 8. Quadrant labels ──
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    for (const q of QUADRANTS) {
      const qcx = ((q.xMin + q.xMax) / 2) * 10 - 5;
      const qcy = ((q.yMin + q.yMax) / 2) * 10 - 5;
      const p = project3D(qcx, 0, -qcy, rotateX, rotateY, scale, cx, cy);
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 6;
      ctx.fillStyle = q.labelColor;
      const lines = q.label.split('\n');
      for (let li = 0; li < lines.length; li++) {
        ctx.fillText(lines[li], p.sx, p.sy + li * 18 - ((lines.length - 1) * 9));
      }
    }
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // ── 9. Project and sort countries ──
    const projected = data.map(c => {
      const x3d = c.substantive_score / 100 * 10 - 5;
      const z3d = -(c.formal_score / 100 * 10 - 5);
      const p = project3D(x3d, 0.3, z3d, rotateX, rotateY, scale, cx, cy);
      const baseRadius = 18 * (0.8 + (Math.abs(c.gap) / 100) * 0.5);
      const depthScale = PERSPECTIVE / (PERSPECTIVE + p.depth);
      const radius = baseRadius * depthScale;
      return { country: c, ...p, radius };
    });

    projected.sort((a, b) => b.depth - a.depth);

    // ── 10. Render countries ──
    let detectedCountry: string | null = null;
    const selIsos = selected.map(s => s.iso_code);

    for (const pc of projected) {
      const { country: c, sx: px, sy: py, radius } = pc;
      const flag = isoToFlag(c.iso_code);
      const isHovered = hoveredCountry === c.iso_code;
      const isSelected = selIsos.includes(c.iso_code);
      const hasSelection = selected.length > 0;

      // Hit detection
      const dx = mousePos.x - px;
      const dy = mousePos.y - py;
      if (dx * dx + dy * dy < radius * radius * 1.5) {
        detectedCountry = c.iso_code;
      }

      // Dim unselected when selection exists
      const dimmed = hasSelection && !isSelected && !isHovered;
      ctx.globalAlpha = dimmed ? 0.4 : 1;

      // Hover glow
      if (isHovered || isSelected) {
        const glowGrad = ctx.createRadialGradient(px, py, 0, px, py, radius * 2.5);
        const glowColor = isSelected ? 'rgba(255, 220, 150, ' : 'rgba(255, 255, 255, ';
        glowGrad.addColorStop(0, glowColor + '0.5)');
        glowGrad.addColorStop(0.4, glowColor + '0.2)');
        glowGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(px, py, radius * 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Shadow (non-hover only)
      if (!isHovered) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
      }

      // Flag emoji
      ctx.font = `${radius * 2}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(flag || '●', px, py);

      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      // Hover label
      if (isHovered) {
        ctx.font = 'bold 15px sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 10;
        ctx.fillText(c.name, px, py - radius - 10);
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
      }

      // Selected badge
      if (isSelected) {
        const selIdx = selIsos.indexOf(c.iso_code);
        ctx.font = 'bold 11px sans-serif';
        ctx.fillStyle = '#fafaf9';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const badgeX = px + radius;
        const badgeY = py - radius;
        ctx.beginPath();
        ctx.arc(badgeX, badgeY, 10, 0, Math.PI * 2);
        ctx.fillStyle = ['#0f0f0f', '#5a564b', '#8a8680', '#b5b0a5'][selIdx] || '#8a8680';
        ctx.fill();
        ctx.fillStyle = '#fafaf9';
        ctx.fillText(String(selIdx + 1), badgeX, badgeY);
      }

      ctx.globalAlpha = 1;
    }

    // ── 11. Update hover states ──
    setHoveredCountry(detectedCountry);
    setHoveredQuadrant(detectedCountry ? null : detectedQuadrant);

    // Reset text alignment
    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';

  }, [rotateX, rotateY, mousePos, isDragging, hoveredCountry, hoveredQuadrant, data, selected]);

  if (view !== 'plane3d') return null;

  return (
    <div style={{ position: 'relative', width: '100%', height: '560px' }}>
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onClick={handleClick}
        style={{
          width: '100%',
          height: '100%',
          cursor: isDragging ? 'grabbing' : 'grab',
          borderRadius: 4,
          display: 'block',
        }}
      />

      {/* Title overlay */}
      <div style={{
        position: 'absolute', top: 20, left: 20, pointerEvents: 'none',
      }}>
        <div style={{
          fontFamily: "'Instrument Serif', serif",
          fontSize: 22, color: 'rgba(255,255,255,0.9)',
          marginBottom: 6,
        }}>
          The Sovereignty Plane
        </div>
        <div style={{
          fontFamily: "'Inter Variable', sans-serif",
          fontSize: 12, color: 'rgba(200,200,200,0.6)',
        }}>
          Drag to rotate &middot; Scroll to tilt &middot; Click to select
        </div>
      </div>

      {/* Coherence line legend */}
      <div style={{
        position: 'absolute', bottom: 20, left: 20, pointerEvents: 'none',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <div style={{
          width: 24, height: 0,
          borderTop: '2px dashed rgba(255, 200, 100, 0.7)',
        }} />
        <span style={{
          fontFamily: "'Inter Variable', sans-serif",
          fontSize: 11, color: 'rgba(255, 200, 100, 0.7)',
        }}>
          Coherence line (formal = substantive)
        </span>
      </div>
    </div>
  );
}
