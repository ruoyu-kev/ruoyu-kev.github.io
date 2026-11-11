/* =========================================================
   黑雨 · 首页动效合集
   ========================================================= */
(function () {
  'use strict';

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = window.matchMedia('(hover: none)').matches;

  if (prefersReduced) return; // 无障碍：用户开启了减弱动态则全部关闭

  /* =========================================================
     1. 全局光标光晕
     ========================================================= */
  const glow = document.querySelector('.cursor-glow');
  if (glow && !isTouch) {
    let raf = null, tx = 0, ty = 0;
    document.addEventListener('mousemove', e => {
      tx = e.clientX; ty = e.clientY;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        glow.style.setProperty('--mx', tx + 'px');
        glow.style.setProperty('--my', ty + 'px');
        raf = null;
      });
    }, { passive: true });
  }

  /* =========================================================
     2. 卡片倾斜 + 光斑跟随
     ========================================================= */
  if (!isTouch) {
    const TILT = 6; // 倾斜角度，建议 4~6
    document.querySelectorAll('.tilt').forEach(el => {
      el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left;
        const y = e.clientY - r.top;
        const px = x / r.width;
        const py = y / r.height;
        
        el.style.transform = `perspective(700px) rotateX(${(0.5 - py) * TILT * 2}deg) rotateY(${(px - 0.5) * TILT * 2}deg)`;
        el.style.setProperty('--tx', x + 'px');
        el.style.setProperty('--ty', y + 'px');
      }, { passive: true });

      el.addEventListener('mouseleave', () => {
        el.style.transform = '';
      });
    });
  }

  /* =========================================================
     3. 按钮磁吸
     ========================================================= */
  if (!isTouch) {
    const STRENGTH = 0.18; // 偏移系数 0.1~0.25
    document.querySelectorAll('.magnetic').forEach(el => {
      el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        el.style.transform = `translate(${x * STRENGTH}px, ${y * STRENGTH}px)`;
      }, { passive: true });

      el.addEventListener('mouseleave', () => {
        el.style.transform = '';
      });
    });
  }

  /* =========================================================
     4. 黑雨粒子 Canvas
     ========================================================= */
  const cvs = document.getElementById('rain-canvas');
  if (cvs) {
    const ctx = cvs.getContext('2d');
    let W, H, DPR, drops = [];
    const COUNT = window.innerWidth < 768 ? 40 : 90;

    function resize() {
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      W = cvs.width = innerWidth * DPR;
      H = cvs.height = innerHeight * DPR;
      cvs.style.width = innerWidth + 'px';
      cvs.style.height = innerHeight + 'px';
    }

    function makeDrop() {
      return {
        x: Math.random() * W,
        y: Math.random() * H,
        len: (12 + Math.random() * 22) * DPR,
        speed: (3 + Math.random() * 4) * DPR,
        drift: 0.4 * DPR,
        alpha: 0.15 + Math.random() * 0.25
      };
    }

    function init() {
      resize();
      drops = Array.from({ length: COUNT }, makeDrop);
    }

    let last = 0, paused = false;
    document.addEventListener('visibilitychange', () => paused = document.hidden);

    function frame(t) {
      requestAnimationFrame(frame);
      if (paused) return;
      if (t - last < 33) return; // 限制到 ~30fps，省电
      last = t;

      ctx.clearRect(0, 0, W, H);
      ctx.lineCap = 'round';

      for (const d of drops) {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(201,35,35,${d.alpha})`;
        ctx.lineWidth = 1 * DPR;
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x - d.drift, d.y + d.len);
        ctx.stroke();

        d.x -= d.drift;
        d.y += d.speed;

        if (d.y > H + d.len) { d.y = -d.len; d.x = Math.random() * W; }
        if (d.x < -10) d.x = W + 10;
      }
    }

    init();
    addEventListener('resize', init);
    requestAnimationFrame(frame);
  }

  /* =========================================================
     5. 辅助：按钮点击/悬停音效（可选，如果你想加）
     ========================================================= */
  // 如果你需要之前讨论的音效，可以在这里加上 playTick 等逻辑
})();