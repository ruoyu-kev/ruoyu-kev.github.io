/* 黑雨 · 跨页面续播播放器 */
/* =========================================================
   黑雨 · 歌单播放器 (跨页面续播)
 /* =========================================================
   黑雨 · 歌单播放器 (包含独立雨声控制)
   ========================================================= */
(function () {
  'use strict';

  // 歌单配置区（替换为你自己的曲目）
  const PLAYLIST = [
    { title: 'stillness', artist: 'lux-aeterna', src: 'assets/music/lux-aeterna-stillness-528421.mp3'},
    { title: 'saibo-ting-electronica', artist: 'meditativetiger', src: 'assets/music/meditativetiger-saibo-ting-electronica-downtempo-beat-367348.mp3' },
    { title: 'zero-g-lounge',artist:'meditativetiger', src: 'assets/music/meditativetiger-zero-g-lounge-422701.mp3' },
    { title: 'nebula', artist: 'night_city_radio', src: 'assets/music/night_city_radio-nebula-328169.mp3' }
  ];

  const KEY = 'blackrain:playlist-state';

  // DOM 元素s
  const widget     = document.getElementById('music-widget');
  const bgm        = document.getElementById('bgm-player');
  const rain       = document.getElementById('rain-player');
  const toggleBtn  = document.getElementById('music-toggle');
  const nextBtn    = document.getElementById('music-next');
  const rainBtn    = document.getElementById('music-rain');
  const titleEl    = document.getElementById('music-title');
  const artistEl   = document.getElementById('music-artist');
  const listEl     = document.getElementById('music-list');

  if (!bgm || !toggleBtn) return;
  bgm.volume = 0.2;   // 背景音乐音量，范围 0.0 ~ 1.0 (0.3~0.5 比较合适)
  rain.volume = 0.5; // 环境雨声音量，范围 0.0 ~ 1.0 (0.1~0.2 比较合适，不要盖过BGM)


  let currentIndex = 0;
  let wantPlay = false; // BGM 的播放意图
  let wantRain = false; // 雨声的播放意图

  let canStore = true;
  try { sessionStorage.setItem('__t', '1'); sessionStorage.removeItem('__t'); } catch (e) { canStore = false; }

  // 状态存取
  function writeState() {
    if (!canStore) return;
    try {
      sessionStorage.setItem(KEY, JSON.stringify({
        playing: wantPlay,
        rain: wantRain,
        index: currentIndex,
        t: bgm.currentTime || 0,
        rt: rain.currentTime || 0,
        at: Date.now()
      }));
    } catch (e) {}
  }

  function readState() {
    if (!canStore) return null;
    try { return JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch (e) { return null; }
  }

  // UI 渲染
  function renderPlaylist() {
    listEl.innerHTML = PLAYLIST.map((track, i) => 
      `<li data-index="${i}" class="${i === currentIndex ? 'is-active' : ''}"><span>${track.title}</span></li>`
    ).join('');
  }

  function updateTrackInfo() {
    const track = PLAYLIST[currentIndex];
    titleEl.textContent = track.title;
    artistEl.textContent = track.artist;
    Array.from(listEl.children).forEach((li, i) => {
      li.classList.toggle('is-active', i === currentIndex);
    });
  }

  // 独立控制音频 (防止一个失败导致另一个也失败)
  function playAudio(audio) { return audio.play().catch(() => {}); }
  function pauseAudio(audio) { audio.pause(); }

  function syncUI() {
    toggleBtn.classList.toggle('playing', wantPlay);
    if (rainBtn) rainBtn.classList.toggle('is-active', wantRain);
  }

  // 控制 BGM
  function playBGM() {
    wantPlay = true;
    playAudio(bgm);
    syncUI();
    writeState();
  }
  function stopBGM() {
    wantPlay = false;
    pauseAudio(bgm);
    syncUI();
    writeState();
  }

  // 控制雨声
  function playRain() {
    wantRain = true;
    playAudio(rain);
    syncUI();
    writeState();
  }
  function stopRain() {
    wantRain = false;
    pauseAudio(rain);
    syncUI();
    writeState();
  }

  function loadTrack(index) {
    currentIndex = index;
    bgm.src = PLAYLIST[currentIndex].src;
    updateTrackInfo();
    if (wantPlay) playAudio(bgm);
  }

  /* ====== 初始化与恢复 ====== */
  const prev = readState();
  if (prev) {
    currentIndex = prev.index || 0;
    wantPlay = !!prev.playing;
    wantRain = !!prev.rain;

    bgm.src = PLAYLIST[currentIndex].src;

    const gap = (prev.playing || prev.rain) ? Math.max(0, (Date.now() - (prev.at || Date.now())) / 1000) : 0;
    
    const seek = (audio, t) => {
      if (!t) return;
      const apply = () => {
        try {
          const d = audio.duration;
          audio.currentTime = (isFinite(d) && d > 0) ? (t % d) : t;
        } catch (e) {}
      };
      if (audio.readyState >= 1) apply();
      else audio.addEventListener('loadedmetadata', apply, { once: true });
    };
    
    seek(bgm, (prev.t || 0) + gap);
    seek(rain, (prev.rt || 0) + gap);
  } else {
    bgm.src = PLAYLIST[0].src;
    // 默认不开启播放，等待用户点击
    wantPlay = false;
    wantRain = false;
  }

  renderPlaylist();
  updateTrackInfo();
  syncUI();

  // 浏览器自动播放策略解锁
  const unlock = () => {
    document.removeEventListener('pointerdown', unlock, true);
    document.removeEventListener('keydown', unlock, true);
    if (wantPlay) playAudio(bgm);
    if (wantRain) playAudio(rain);
  };
  document.addEventListener('pointerdown', unlock, true);
  document.addEventListener('keydown', unlock, true);

  // 如果是刚才在播的，进来直接尝试继续播
  if (wantPlay) playAudio(bgm);
  if (wantRain) playAudio(rain);

  /* ====== 事件绑定 ====== */
  toggleBtn.addEventListener('click', () => wantPlay ? stopBGM() : playBGM());

  if (rainBtn) {
    rainBtn.addEventListener('click', () => wantRain ? stopRain() : playRain());
  }

  nextBtn.addEventListener('click', () => {
    loadTrack((currentIndex + 1) % PLAYLIST.length);
    writeState();
  });

  // 自动下一首
  bgm.addEventListener('ended', () => nextBtn.click());

  // 点击列表切歌
  listEl.addEventListener('click', (e) => {
    const li = e.target.closest('li');
    if (!li) return;
    loadTrack(parseInt(li.dataset.index, 10));
    if (!wantPlay) playBGM();
    else writeState();
  });

  // 移动端点击展开
  widget.addEventListener('click', (e) => {
    if (e.target.closest('.music-toggle') || e.target.closest('.music-next') || e.target.closest('.music-rain') || e.target.closest('.music-list')) return;
    widget.classList.toggle('is-open');
  });

  // 定期保存与切后台处理
  setInterval(() => { if (wantPlay || wantRain) writeState(); }, 1000);
  
  addEventListener('pagehide', writeState);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      writeState();
      pauseAudio(bgm);
      pauseAudio(rain);
    } else {
      if (wantPlay) playAudio(bgm);
      if (wantRain) playAudio(rain);
    }
  });
})();