/* =========================================================
   黑雨 · 纯代码合成音效 (Web Audio API)
   ========================================================= */
(function () {
  'use strict';

  let ctx = null;
  let masterGain = null;
  let muted = false;
  let lastTickAt = 0;
  const TICK_MIN_GAP = 100; // 节流：两次滴答声最小间隔（毫秒）

  // 首次交互时创建/恢复 AudioContext（绕过浏览器自动播放限制）
  function ensureCtx() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      masterGain = ctx.createGain();
      masterGain.gain.value = 0.25; // 总音量，0.2~0.3 比较合适，不会压过BGM
      masterGain.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function initOnFirstGesture() {
    const unlock = () => {
      ensureCtx();
      document.removeEventListener('pointerdown', unlock, true);
      document.removeEventListener('keydown', unlock, true);
    };
    document.addEventListener('pointerdown', unlock, true);
    document.addEventListener('keydown', unlock, true);
  }

  // 基础发声：短促“信号滴”
  function blip({ freq = 880, dur = 0.06, type = 'sine', gain = 0.2, slideTo = null } = {}) {
    const ac = ensureCtx();
    if (!ac || muted) return;

    const t = ac.currentTime;
    const osc = ac.createOscillator();
    const g   = ac.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);

    // 极短 attack + 指数衰减，避免爆音
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    osc.connect(g);
    g.connect(masterGain);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  // 噪声：用于极轻微的空气感
  function noiseBurst({ dur = 0.1, gain = 0.05, filterFreq = 1200 } = {}) {
    const ac = ensureCtx();
    if (!ac || muted) return;

    const t = ac.currentTime;
    const buffer = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    const src = ac.createBufferSource();
    src.buffer = buffer;

    const filter = ac.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    filter.Q.value = 0.8;

    const g = ac.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    src.connect(filter);
    filter.connect(g);
    g.connect(masterGain);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  // 对外暴露的接口
  window.playTick = function () {
    const now = performance.now();
    if (now - lastTickAt < TICK_MIN_GAP) return;
    lastTickAt = now;
    // 极其轻柔的“咔”
    blip({ freq: 196, dur: 0.08, type: 'triangle', gain: 0.12 });
    blip({ freq: 1320, dur: 0.03, type: 'sine', gain: 0.05 });
  };

  window.playClick = function () {
    // 上扬的短促滑音，像“锁定目标”
    blip({ freq: 440, dur: 0.08, type: 'sine', gain: 0.12, slideTo: 880 });
  };

  window.playHover = function () {
    // 几乎听不见的气流声
    noiseBurst({ dur: 0.05, gain: 0.02, filterFreq: 1600 });
  };

  // 全局静音开关
  window.toggleSFX = function () {
    muted = !muted;
    if (masterGain) {
      masterGain.gain.setTargetAtTime(muted ? 0 : 0.25, ctx.currentTime, 0.02);
    }
    return muted;
  };

  initOnFirstGesture();
})();