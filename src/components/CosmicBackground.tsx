import React, { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  size: number;
  baseAlpha: number;
  twinkleSpeed: number;
  phase: number;
  layer: number; // 1 = far, 2 = mid, 3 = near
  color: string;
}

interface Comet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  length: number;
  size: number;
  alpha: number;
  decay: number;
  color: string;
}

interface Planet {
  x: number;
  y: number;
  radius: number;
  baseX: number;
  baseY: number;
  speed: number;
  color1: string;
  color2: string;
  glowColor: string;
  hasRing: boolean;
  ringColor: string;
  phase: number;
}

export const CosmicBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Check device capabilities and user preference
    const isMobile = width < 768;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Scale counts based on device
    const starCount = prefersReducedMotion ? 40 : isMobile ? 90 : 220;
    const stars: Star[] = [];
    const starColors = ['#ffffff', '#bae6fd', '#e0e7ff', '#fef08a'];

    for (let i = 0; i < starCount; i++) {
      const layer = Math.random() < 0.6 ? 1 : Math.random() < 0.85 ? 2 : 3;
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: layer === 1 ? Math.random() * 1.2 + 0.5 : layer === 2 ? Math.random() * 1.8 + 1 : Math.random() * 2.5 + 1.5,
        baseAlpha: Math.random() * 0.5 + 0.3,
        twinkleSpeed: Math.random() * 0.03 + 0.01,
        phase: Math.random() * Math.PI * 2,
        layer,
        color: starColors[Math.floor(Math.random() * starColors.length)]
      });
    }

    // Planets
    const planets: Planet[] = [
      {
        x: width * 0.82,
        y: height * 0.22,
        baseX: width * 0.82,
        baseY: height * 0.22,
        radius: isMobile ? 24 : 38,
        speed: 0.0003,
        color1: '#0284c7', // Deep Cyan / Blue
        color2: '#082f49',
        glowColor: 'rgba(56, 189, 248, 0.25)',
        hasRing: true,
        ringColor: 'rgba(186, 230, 253, 0.4)',
        phase: 0
      },
      {
        x: width * 0.12,
        y: height * 0.72,
        baseX: width * 0.12,
        baseY: height * 0.72,
        radius: isMobile ? 18 : 28,
        speed: 0.0002,
        color1: '#7c3aed', // Purple Nebula planet
        color2: '#2e1065',
        glowColor: 'rgba(168, 85, 247, 0.2)',
        hasRing: false,
        ringColor: '',
        phase: Math.PI
      }
    ];

    if (!isMobile) {
      // Distant amber dwarf planet for desktop
      planets.push({
        x: width * 0.35,
        y: height * 0.15,
        baseX: width * 0.35,
        baseY: height * 0.15,
        radius: 14,
        speed: 0.00015,
        color1: '#f59e0b',
        color2: '#78350f',
        glowColor: 'rgba(245, 158, 11, 0.18)',
        hasRing: false,
        ringColor: '',
        phase: Math.PI / 2
      });
    }

    // Comets / Shooting Stars
    const comets: Comet[] = [];
    let lastCometSpawn = Date.now();

    const spawnComet = () => {
      const angle = (Math.PI / 4) + (Math.random() * 0.3 - 0.15); // Diagonal down-right
      const speed = Math.random() * 4 + 4;
      comets.push({
        x: Math.random() * (width * 0.8),
        y: -30,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        length: Math.random() * 80 + 70,
        size: Math.random() * 1.5 + 1.2,
        alpha: 1,
        decay: Math.random() * 0.008 + 0.005,
        color: Math.random() > 0.4 ? '#38bdf8' : '#c084fc'
      });
    };

    // Parallax mouse position
    let mouseX = width / 2;
    let mouseY = height / 2;
    let targetMouseX = width / 2;
    let targetMouseY = height / 2;

    const handleMouseMove = (e: MouseEvent) => {
      targetMouseX = e.clientX;
      targetMouseY = e.clientY;
    };

    if (!isMobile) {
      window.addEventListener('mousemove', handleMouseMove, { passive: true });
    }

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Main animation loop
    let lastTime = performance.now();

    const render = (time: number) => {
      const delta = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      // Parallax smoothing
      mouseX += (targetMouseX - mouseX) * 0.05;
      mouseY += (targetMouseY - mouseY) * 0.05;
      const offsetX = (mouseX - width / 2) * 0.02;
      const offsetY = (mouseY - height / 2) * 0.02;

      // Clear with deep space canvas
      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 0, width, height);

      // 1. Nebula clouds (Radial soft gradient glows)
      const grad1 = ctx.createRadialGradient(
        width * 0.2 + offsetX,
        height * 0.3 + offsetY,
        10,
        width * 0.2 + offsetX,
        height * 0.3 + offsetY,
        width * (isMobile ? 0.45 : 0.4)
      );
      grad1.addColorStop(0, 'rgba(88, 28, 135, 0.15)'); // deep purple
      grad1.addColorStop(0.5, 'rgba(30, 27, 75, 0.08)');
      grad1.addColorStop(1, 'rgba(3, 7, 18, 0)');
      ctx.fillStyle = grad1;
      ctx.fillRect(0, 0, width, height);

      const grad2 = ctx.createRadialGradient(
        width * 0.8 - offsetX,
        height * 0.7 - offsetY,
        20,
        width * 0.8 - offsetX,
        height * 0.7 - offsetY,
        width * (isMobile ? 0.5 : 0.45)
      );
      grad2.addColorStop(0, 'rgba(14, 116, 144, 0.14)'); // deep cyan/blue
      grad2.addColorStop(0.6, 'rgba(15, 23, 42, 0.06)');
      grad2.addColorStop(1, 'rgba(3, 7, 18, 0)');
      ctx.fillStyle = grad2;
      ctx.fillRect(0, 0, width, height);

      // 2. Stars
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        if (!prefersReducedMotion) {
          s.phase += s.twinkleSpeed;
        }
        const alpha = s.baseAlpha + Math.sin(s.phase) * 0.25;

        // Layer parallax
        const px = s.x - offsetX * (s.layer * 0.4);
        const py = s.y - offsetY * (s.layer * 0.4);

        ctx.fillStyle = s.color;
        ctx.globalAlpha = Math.max(0.1, Math.min(1, alpha));
        ctx.beginPath();
        ctx.arc(px, py, s.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // 3. Planets
      for (const p of planets) {
        if (!prefersReducedMotion) {
          p.phase += p.speed;
        }
        const px = p.baseX + Math.sin(p.phase) * 15 - offsetX * 0.5;
        const py = p.baseY + Math.cos(p.phase) * 10 - offsetY * 0.5;

        // Atmosphere glow
        ctx.globalAlpha = 1;
        const glow = ctx.createRadialGradient(px, py, p.radius * 0.8, px, py, p.radius * 2);
        glow.addColorStop(0, p.glowColor);
        glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(px, py, p.radius * 2, 0, Math.PI * 2);
        ctx.fill();

        // Planet body
        const planetGrad = ctx.createLinearGradient(
          px - p.radius,
          py - p.radius,
          px + p.radius,
          py + p.radius
        );
        planetGrad.addColorStop(0, p.color1);
        planetGrad.addColorStop(1, p.color2);
        ctx.fillStyle = planetGrad;
        ctx.beginPath();
        ctx.arc(px, py, p.radius, 0, Math.PI * 2);
        ctx.fill();

        // Saturn-like ring
        if (p.hasRing) {
          ctx.save();
          ctx.translate(px, py);
          ctx.rotate(-0.35);
          ctx.beginPath();
          ctx.ellipse(0, 0, p.radius * 2.3, p.radius * 0.55, 0, 0, Math.PI * 2);
          ctx.strokeStyle = p.ringColor;
          ctx.lineWidth = isMobile ? 3 : 5;
          ctx.stroke();
          ctx.restore();
        }
      }

      // 4. Comets / Shooting Stars
      if (!prefersReducedMotion && Date.now() - lastCometSpawn > 4500) {
        if (Math.random() < 0.6) {
          spawnComet();
          lastCometSpawn = Date.now();
        }
      }

      for (let i = comets.length - 1; i >= 0; i--) {
        const c = comets[i];
        c.x += c.vx;
        c.y += c.vy;
        c.alpha -= c.decay;

        if (c.alpha <= 0 || c.x > width + 100 || c.y > height + 100) {
          comets.splice(i, 1);
          continue;
        }

        ctx.globalAlpha = c.alpha;
        const tailX = c.x - (c.vx / 5) * c.length;
        const tailY = c.y - (c.vy / 5) * c.length;

        const cometGrad = ctx.createLinearGradient(c.x, c.y, tailX, tailY);
        cometGrad.addColorStop(0, '#ffffff');
        cometGrad.addColorStop(0.3, c.color);
        cometGrad.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.strokeStyle = cometGrad;
        ctx.lineWidth = c.size;
        ctx.beginPath();
        ctx.moveTo(c.x, c.y);
        ctx.lineTo(tailX, tailY);
        ctx.stroke();

        // Head glowing particle
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.size * 1.2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      if (!isMobile) {
        window.removeEventListener('mousemove', handleMouseMove);
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
      {/* Realtime Canvas Background */}
      <canvas ref={canvasRef} className="w-full h-full block" />
      {/* High-legibility translucent dark overlay for test question reading clarity */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/60 via-slate-950/75 to-slate-950/90 pointer-events-none" />
    </div>
  );
};
