/* ===================================================
   PhyGame – script.js
   斜方投射シミュレーション（PhyGame 論文準拠）
   公式: x = v0 * cos(θ) * t
         y = v0 * sin(θ) * t - 0.5 * g * t²
   問題設定: θ=30°, 水平距離=19.6√3 m, t_hit=2 s
             正解 v0 = 19.6√3 / (cos30° * 2) = 19.6 m/s (厳密値)
   =================================================== */

'use strict';

// ─────────────────────────────────────────────
// 0. オーディオシステム (Web Audio API)
// ─────────────────────────────────────────────
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();
let isMuted = false;

document.getElementById('muteBtn').addEventListener('click', function() {
  isMuted = !isMuted;
  this.textContent = isMuted ? '🔇 ミュート中' : '🔊 音声オン';
});

function playTone(freq, type, duration, vol) {
  if (isMuted) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  gain.gain.setValueAtTime(vol, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

function playNoise(duration, vol) {
  if (isMuted) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const bufferSize = audioCtx.sampleRate * duration;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1000;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(vol, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);
  noise.start();
}

function playFireSound() {
  playNoise(0.5, 0.5);
  playTone(100, 'square', 0.3, 0.3);
}

function playHitSound() {
  playTone(523.25, 'sine', 0.1, 0.3); // C5
  setTimeout(() => playTone(659.25, 'sine', 0.3, 0.3), 100); // E5
}

function playMissSound() {
  playTone(150, 'sawtooth', 0.3, 0.3);
  setTimeout(() => playTone(100, 'sawtooth', 0.4, 0.3), 150);
}

// ─────────────────────────────────────────────
// 1. 物理定数・問題パラメータ & 問題リスト
// ─────────────────────────────────────────────
const G           = 9.8;
const HIT_X_MARGIN = 0.3;

let PROBLEMS = [];

function generateRandomProblems() {
  const newProblems = [];

  // --- 斜方投射 (Oblique) ---
  const obliqueConfigs = [
    { thetaDeg: 30, tHit: 2, xCoef: 19.6, v0Text: "19.6", chips: [{text:"√3 ≈ 1.7321"},{text:"cos 30° = √3/2 ≈ 0.8660"},{text:"g = 9.8"}] },
    { thetaDeg: 45, tHit: 2, xCoef: 19.6, v0Text: "13.86 (または厳密値 9.8√2)", chips: [{text:"√2 ≈ 1.4142"},{text:"cos 45° = √2/2 ≈ 0.7071"},{text:"g = 9.8"}] },
    { thetaDeg: 60, tHit: 3, xCoef: 14.7, v0Text: "16.97 (または厳密値 9.8√3)", chips: [{text:"√3 ≈ 1.7321"},{text:"cos 60° = 0.5"},{text:"g = 9.8"}] }
  ];
  const obl = obliqueConfigs[Math.floor(Math.random() * obliqueConfigs.length)];
  const oblX = obl.thetaDeg === 45 ? obl.xCoef : obl.xCoef * Math.sqrt(3);
  const oblXStr = obl.thetaDeg === 45 ? obl.xCoef.toString() : obl.xCoef + '√3';
  
  newProblems.push({
    type: 'oblique',
    text: `【斜方投射モード】<br>ボールとターゲットは <strong>${oblXStr} m</strong> 離れている。<br>水平面から仰角 <strong>${obl.thetaDeg}°</strong> で投げ出し、<strong>${obl.tHit} 秒後</strong>に当てたい。<br>初速を求めよ。<small>（g = 9.8 m/s²）</small>`,
    xTarget: oblX,
    yTarget: 0,
    cannonY: 0,
    thetaDeg: obl.thetaDeg,
    tHit: obl.tHit,
    correctV0Text: obl.v0Text,
    chips: obl.chips,
    hint: function(v0) { return `<ol><li>x = v₀ × cos(${obl.thetaDeg}°) × t</li><li>x ≈ ${oblX.toFixed(2)}, t = ${obl.tHit} を代入します。</li></ol>`; }
  });

  // --- 水平投射 (Horizontal) ---
  const horizConfigs = [
    { H: 19.6, tHit: 2, X: 30, v0Text: "15" },
    { H: 44.1, tHit: 3, X: 60, v0Text: "20" },
    { H: 78.4, tHit: 4, X: 100, v0Text: "25" }
  ];
  const hor = horizConfigs[Math.floor(Math.random() * horizConfigs.length)];
  newProblems.push({
    type: 'horizontal',
    text: `【水平投射モード】<br>高さ <strong>${hor.H} m</strong> の崖から、水平（仰角 <strong>0°</strong>）に撃ち出す。<br>下の地面にある <strong>${hor.X} m</strong> 先のターゲットに当てたい。<br>初速を求めよ。<small>（g = 9.8 m/s²）</small>`,
    xTarget: hor.X,
    yTarget: 0,
    cannonY: hor.H,
    thetaDeg: 0,
    tHit: hor.tHit,
    correctV0Text: hor.v0Text,
    chips: [{text:"y = H - 0.5*g*t²"},{text:"x = v0 * t"},{text:"g = 9.8"}],
    hint: function(v0) { return `<ol><li>まず落下時間 t を求めます。y = H - 0.5gt² = 0 より、t = √(2H/g)</li><li>H = ${hor.H} なので t = ${hor.tHit}秒。</li><li>次に x = v₀ × t に x=${hor.X}, t=${hor.tHit} を代入します。</li></ol>`; }
  });

  // --- 鉛直投げ上げ (Vertical) ---
  const vertConfigs = [
    { H: 19.6, tHit: 2, v0Text: "19.6" },
    { H: 44.1, tHit: 3, v0Text: "29.4" },
    { H: 78.4, tHit: 4, v0Text: "39.2" }
  ];
  const ver = vertConfigs[Math.floor(Math.random() * vertConfigs.length)];
  newProblems.push({
    type: 'vertical',
    text: `【鉛直投げ上げモード】<br>ボールを真上（仰角 <strong>90°</strong>）に打ち上げる。<br>ボールが<strong>最高点</strong>に達した瞬間に、高さ <strong>${ver.H} m</strong> にあるターゲットに当てたい。<br>初速を求めよ。<small>（g = 9.8 m/s²）</small>`,
    xTarget: 0,
    yTarget: ver.H,
    cannonY: 0,
    thetaDeg: 90,
    tHit: ver.tHit,
    correctV0Text: ver.v0Text,
    chips: [{text:"v² - v₀² = -2gy"},{text:"最高点では v = 0"},{text:"g = 9.8"}],
    hint: function(v0) { return `<ol><li>最高点での速度は v = 0 です。</li><li>公式 v² - v₀² = -2gy に v=0, y=${ver.H} を代入します。</li><li>0 - v₀² = -2 × 9.8 × ${ver.H} より v₀ を求めます。</li></ol>`; }
  });

  // シャッフル
  newProblems.sort(() => Math.random() - 0.5);
  
  // numを振り直す
  newProblems.forEach((p, i) => { p.num = i + 1; });

  return newProblems;
}

let currentProblemIndex = 0;
let totalFires = 0;
let totalHints = 0;
let attemptsRemaining = 3;
let currentUsername = '';
let problemStats = [];

let X_TARGET;
let Y_TARGET;
let CANNON_Y;
let THETA_DEG;
let THETA_RAD;
let T_HIT;
let CURRENT_TYPE;

let PHYS_W;
let MAX_PHYS_H;
let SCALE_X;
let SCALE_Y;

// ─────────────────────────────────────────────
// 2. Canvas セットアップ
// ─────────────────────────────────────────────
const canvas  = document.getElementById('simCanvas');
const ctx     = canvas.getContext('2d');

const CANVAS_W = canvas.width;    // 800
const CANVAS_H = canvas.height;   // 360
const MARGIN_X = 60;
const MARGIN_Y = 40;
const GROUND_Y = CANVAS_H - 50;

function toCanvas(px, py) {
  // px is relative to cannon X=0
  // py is absolute height from ground
  return {
    x: MARGIN_X + px * SCALE_X,
    y: GROUND_Y - py * SCALE_Y
  };
}

function updateAttemptsUI() {
  const badge = document.getElementById('attemptsBadge');
  badge.textContent = '残り挑戦回数: ' + attemptsRemaining + '回';
  if (attemptsRemaining <= 1) {
    badge.classList.add('warning');
  } else {
    badge.classList.remove('warning');
  }
}

function resetSimulation() {
  stopAnimation();
  hideResult();
  trail.length = 0;
  physTime = 0;
  lastTS   = null;
  document.getElementById('hintArea').classList.add('hidden');
  drawScene();
}

function loadProblem(index) {
  currentProblemIndex = index;
  const p = PROBLEMS[index];
  
  CURRENT_TYPE = p.type;
  X_TARGET = p.xTarget;
  Y_TARGET = p.yTarget;
  CANNON_Y = p.cannonY;
  THETA_DEG = p.thetaDeg;
  THETA_RAD = (THETA_DEG * Math.PI) / 180;
  T_HIT = p.tHit;
  
  if (p.type === 'oblique') {
    PHYS_W = X_TARGET * 1.18;
    const v0Est = X_TARGET / (Math.cos(THETA_RAD) * T_HIT);
    MAX_PHYS_H = Math.pow(v0Est * Math.sin(THETA_RAD), 2) / (2 * G) * 1.3 + 2;
  } else if (p.type === 'horizontal') {
    PHYS_W = X_TARGET * 1.18;
    MAX_PHYS_H = CANNON_Y * 1.3 + 2;
  } else if (p.type === 'vertical') {
    PHYS_W = Y_TARGET * 1.18; // dummy width for nice aspect
    MAX_PHYS_H = Y_TARGET * 1.3 + 2;
  }
  
  SCALE_X = (CANVAS_W - MARGIN_X * 2) / PHYS_W;
  SCALE_Y = (GROUND_Y - MARGIN_Y) / MAX_PHYS_H;
  
  document.getElementById('problemNum').textContent = p.num;
  document.getElementById('problemText').innerHTML = p.text;

  
  const chipsContainer = document.getElementById('constChips');
  chipsContainer.innerHTML = '';
  p.chips.forEach(chipData => {
    const chipSpan = document.createElement('span');
    chipSpan.className = 'chip';
    chipSpan.textContent = chipData.text;
    
    chipSpan.addEventListener('click', function() {
      let text = chipSpan.textContent;
      let val = '';
      if (text.includes('≈')) {
        val = text.split('≈')[1].trim().split(' ')[0];
      } else if (text.includes('=')) {
        val = text.split('=')[1].trim().split(' ')[0];
      }
      
      if (val && calcInput) {
        const start = calcInput.selectionStart;
        const end = calcInput.selectionEnd;
        const currentVal = calcInput.value;
        calcInput.value = currentVal.substring(0, start) + val + currentVal.substring(end);
        calcInput.focus();
        calcInput.setSelectionRange(start + val.length, start + val.length);
      }
    });
    
    chipsContainer.appendChild(chipSpan);
  });
  
  attemptsRemaining = 3;
  updateAttemptsUI();
  
  const fireBtn = document.getElementById('fireBtn');
  fireBtn.disabled = false;
  fireBtn.style.opacity = '1';
  fireBtn.style.cursor = 'pointer';
  
  document.getElementById('v0Input').value = '';
  resetSimulation();
  
  // 開始時間を記録
  problemStats[index].startTime = Date.now();
}

// ─────────────────────────────────────────────
// 3. シミュレーション状態
// ─────────────────────────────────────────────
let animId   = null;
let physTime = 0;
let lastTS   = null;
let isRunning = false;
let v0        = 0;

// ─────────────────────────────────────────────
// 4. ログ配列
// ─────────────────────────────────────────────
const logs = [];

const GAS_URL = 'https://script.google.com/macros/s/AKfycby6esVPkgCB2n3z0IerO34S6ry6mehXF1I95B__khHMrsmaSnuUJVCIbE1OnhuwKy4p/exec'; // 最新の安全なWebアプリURL

function getOrCreateUserId() {
  let uid = localStorage.getItem('phy_user_id');
  if (!uid) {
    uid = 'user_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    localStorage.setItem('phy_user_id', uid);
  }
  return uid;
}

function addLog(action, inputV0, detail = '') {
  const ts = new Date().toISOString().replace('T', ' ').replace('Z', '');
  const probNum = (action === 'SessionStart' || currentProblemIndex === undefined) ? '-' : PROBLEMS[currentProblemIndex].num;
  
  const logData = { timestamp: ts, username: currentUsername, problem: probNum, action, v0: inputV0, detail };
  logs.push(logData);
  // 個別アクションのGASへの送信は廃止し、ローカル記録のみとする
}

function finishAndLogProblem(index) {
  if (!GAS_URL) return;
  const stat = problemStats[index];
  const p = PROBLEMS[index];
  
  const timeSpentSec = stat.startTime ? Math.round((Date.now() - stat.startTime) / 1000) : 0;
  
  const logData = {
    userId: getOrCreateUserId(),
    username: currentUsername,
    problemNum: p.num,
    thetaDeg: p.thetaDeg,
    xTarget: p.xTarget,
    cleared: stat.cleared,
    attempts: stat.attempts,
    hintsUsed: stat.hintsUsed,
    calcUsed: stat.calcUsed || 0,
    timeSpentSec: timeSpentSec,
    v0History: (stat.v0History || []).join(', '),
    calcHistory: (stat.calcHistory || []).join(', '),
    mode: p.type,
    action: "ProblemFinished",
    timestamp: new Date().toISOString().replace('T', ' ').replace('Z', '')
  };
  
  fetch(GAS_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(logData)
  }).catch(err => console.error('Failed to send problem log:', err));
}

// ─────────────────────────────────────────────
// 5. 描画関数
// ─────────────────────────────────────────────
function drawScene(ballPx = null, ballPy = null, trail = []) {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  // 空グラデーション
  const skyGrad = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  skyGrad.addColorStop(0, '#071428');
  skyGrad.addColorStop(1, '#0a2040');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, CANVAS_W, GROUND_Y);

  // 星
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  [[80,30],[200,60],[350,20],[500,45],[650,25],[750,55],
   [130,80],[410,70],[580,35],[720,80]].forEach(([sx, sy]) => {
    ctx.beginPath();
    ctx.arc(sx, sy, 1.2, 0, Math.PI * 2);
    ctx.fill();
  });

  // 地面
  const groundGrad = ctx.createLinearGradient(0, GROUND_Y, 0, CANVAS_H);
  groundGrad.addColorStop(0, '#1a3a1a');
  groundGrad.addColorStop(1, '#0d1f0d');
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, GROUND_Y, CANVAS_W, CANVAS_H - GROUND_Y);
  ctx.strokeStyle = '#3fb950';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  ctx.lineTo(CANVAS_W, GROUND_Y);
  ctx.stroke();

  // 距離ラベル・破線
  if (CURRENT_TYPE !== 'vertical') {
    const targetCv = toCanvas(X_TARGET, 0);
    ctx.fillStyle = '#8b949e';
    ctx.font = '11px Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(X_TARGET.toFixed(2) + ' m', (MARGIN_X + targetCv.x) / 2, GROUND_Y + 18);
    ctx.strokeStyle = '#30363d';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(MARGIN_X, GROUND_Y + 10);
    ctx.lineTo(targetCv.x, GROUND_Y + 10);
    ctx.stroke();
    ctx.setLineDash([]);
  } else {
    const targetCv = toCanvas(0, Y_TARGET);
    ctx.fillStyle = '#8b949e';
    ctx.font = '11px Consolas, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(Y_TARGET.toFixed(2) + ' m', MARGIN_X + 40, (GROUND_Y + targetCv.y) / 2);
  }

  // 発射台 & 崖
  let launchCv;
  if (CURRENT_TYPE === 'horizontal') {
    launchCv = toCanvas(0, CANNON_Y);
    ctx.fillStyle = '#3a4a3a';
    ctx.fillRect(MARGIN_X - 30, launchCv.y, 30, GROUND_Y - launchCv.y);
  } else {
    launchCv = toCanvas(0, 0);
  }
  ctx.fillStyle = '#586069';
  ctx.fillRect(launchCv.x - 12, launchCv.y - 24, 24, 24);

  // 仰角ガイド線
  const guideLen = 40;
  ctx.strokeStyle = 'rgba(47,129,247,0.4)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(launchCv.x, launchCv.y - 24);
  ctx.lineTo(
    launchCv.x + guideLen * Math.cos(THETA_RAD),
    (launchCv.y - 24) - guideLen * Math.sin(THETA_RAD)
  );
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#2f81f7';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(THETA_DEG + '°', launchCv.x + 28, launchCv.y - 36);

  // ターゲット
  let tCv;
  if (CURRENT_TYPE === 'vertical') {
    tCv = toCanvas(0, Y_TARGET);
    ctx.strokeStyle = '#f85149';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(tCv.x, tCv.y, 25, 8, 0, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.fillStyle = '#f85149';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TARGET', tCv.x + 40, tCv.y + 4);
    
    const upperCv  = toCanvas(0, Y_TARGET + HIT_X_MARGIN);
    const lowerCv = toCanvas(0, Y_TARGET - HIT_X_MARGIN);
    ctx.fillStyle = 'rgba(248,81,73,0.08)';
    ctx.fillRect(MARGIN_X - 30, upperCv.y, 60, lowerCv.y - upperCv.y);
  } else {
    tCv = toCanvas(X_TARGET, 0);
    ctx.strokeStyle = '#6a3d00';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(tCv.x, GROUND_Y);
    ctx.lineTo(tCv.x, GROUND_Y - 55);
    ctx.stroke();
    ctx.fillStyle = '#f85149';
    ctx.beginPath();
    ctx.moveTo(tCv.x, GROUND_Y - 55);
    ctx.lineTo(tCv.x + 22, GROUND_Y - 47);
    ctx.lineTo(tCv.x, GROUND_Y - 39);
    ctx.closePath();
    ctx.fill();

    const leftCv  = toCanvas(X_TARGET - HIT_X_MARGIN, 0);
    const rightCv = toCanvas(X_TARGET + HIT_X_MARGIN, 0);
    ctx.fillStyle = 'rgba(248,81,73,0.08)';
    ctx.fillRect(leftCv.x, MARGIN_Y, rightCv.x - leftCv.x, GROUND_Y - MARGIN_Y);
    ctx.strokeStyle = 'rgba(248,81,73,0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(leftCv.x,  MARGIN_Y); ctx.lineTo(leftCv.x,  GROUND_Y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(rightCv.x, MARGIN_Y); ctx.lineTo(rightCv.x, GROUND_Y); ctx.stroke();
    ctx.setLineDash([]);
    
    ctx.fillStyle = '#f85149';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TARGET', tCv.x, GROUND_Y - 60);
  }

  // 軌跡
  if (trail.length > 1) {
    ctx.strokeStyle = 'rgba(255, 200, 80, 0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    trail.forEach(([tx, ty], i) => {
      const tc = toCanvas(tx, ty);
      i === 0 ? ctx.moveTo(tc.x, tc.y) : ctx.lineTo(tc.x, tc.y);
    });
    ctx.stroke();
  }

  // ボール
  if (ballPx !== null && ballPy !== null) {
    const bc = toCanvas(ballPx, ballPy);
    const glowGrad = ctx.createRadialGradient(bc.x, bc.y, 0, bc.x, bc.y, 14);
    glowGrad.addColorStop(0, 'rgba(255,220,80,0.5)');
    glowGrad.addColorStop(1, 'rgba(255,220,80,0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath(); ctx.arc(bc.x, bc.y, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f0a500';
    ctx.beginPath(); ctx.arc(bc.x, bc.y, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath(); ctx.arc(bc.x - 2, bc.y - 2, 2.5, 0, Math.PI * 2); ctx.fill();
  }

  // 情報表示
  ctx.fillStyle = '#8b949e';
  ctx.font = '11px Consolas, monospace';
  ctx.textAlign = 'left';
  ctx.fillText('θ = ' + THETA_DEG + '°  |  g = ' + G + ' m/s²  |  t = ' + physTime.toFixed(2) + ' s', 10, 16);
}

// ─────────────────────────────────────────────
// 6. アニメーションループ
// ─────────────────────────────────────────────
const trail = [];

function animate(timestamp) {
  if (!isRunning) return;

  if (lastTS === null) lastTS = timestamp;
  const dt = Math.min((timestamp - lastTS) / 1000, 0.05);
  lastTS   = timestamp;
  physTime += dt;

  let px, py;
  if (CURRENT_TYPE === 'oblique') {
    px = v0 * Math.cos(THETA_RAD) * physTime;
    py = v0 * Math.sin(THETA_RAD) * physTime - 0.5 * G * physTime * physTime;
  } else if (CURRENT_TYPE === 'horizontal') {
    px = v0 * physTime;
    py = CANNON_Y - 0.5 * G * physTime * physTime;
  } else if (CURRENT_TYPE === 'vertical') {
    px = 0;
    py = v0 * physTime - 0.5 * G * physTime * physTime;
  }

  trail.push([px, py]);
  drawScene(px, py, trail);

  if (physTime >= T_HIT) {
    let err;
    let overMsg = '';
    
    if (CURRENT_TYPE === 'oblique' || CURRENT_TYPE === 'horizontal') {
      let xAtHit;
      if (CURRENT_TYPE === 'oblique') xAtHit = v0 * Math.cos(THETA_RAD) * T_HIT;
      if (CURRENT_TYPE === 'horizontal') xAtHit = v0 * T_HIT;
      err = Math.abs(xAtHit - X_TARGET);
      overMsg = xAtHit > X_TARGET ? '飛びすぎ' : '届かない';
    } else if (CURRENT_TYPE === 'vertical') {
      const yAtHit = v0 * T_HIT - 0.5 * G * T_HIT * T_HIT;
      err = Math.abs(yAtHit - Y_TARGET);
      overMsg = yAtHit > Y_TARGET ? '高すぎる' : '届かない';
    }

    stopAnimation();
    if (err <= HIT_X_MARGIN) {
      problemStats[currentProblemIndex].cleared = true;
      playHitSound();
      showResult('hit', '🎯 Hit!');
      addLog('Hit', v0, 'err=' + err.toFixed(3) + 'm');
    } else {
      playMissSound();
      showResult('miss', '✗ Miss（' + overMsg + '）');
      addLog('Miss', v0, 'err=' + err.toFixed(3) + 'm');
    }
    return;
  }

  // 途中ミス：地面に落下
  if (py < -0.5) {
    stopAnimation();
    playMissSound();
    showResult('miss', '✗ Miss（途中で落下）');
    addLog('Miss', v0, 't=' + physTime.toFixed(2) + 's y=' + py.toFixed(2) + 'm');
    return;
  }

  animId = requestAnimationFrame(animate);
}

function stopAnimation() {
  isRunning = false;
  if (animId) { cancelAnimationFrame(animId); animId = null; }
}

// ─────────────────────────────────────────────
// 7. 結果バナー
// ─────────────────────────────────────────────
const resultBanner = document.getElementById('resultBanner');

function showResult(type, text) {
  resultBanner.innerHTML = '';
  
  const textSpan = document.createElement('span');
  textSpan.textContent = text + ' ';
  resultBanner.appendChild(textSpan);
  
  const isLast = currentProblemIndex === PROBLEMS.length - 1;
  
  if (type === 'hit') {
    const nextBtn = document.createElement('button');
    nextBtn.className = 'btn btn-next';
    nextBtn.textContent = isLast ? '🏆 全問クリア！結果発表 ➔' : '次へ進む ➔';
    
    nextBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      finishAndLogProblem(currentProblemIndex);
      if (isLast) {
        showGameClear();
      } else {
        loadProblem(currentProblemIndex + 1);
      }
    });
    resultBanner.appendChild(nextBtn);
  } else if (type === 'miss' && attemptsRemaining === 0) {
    const correctV0 = PROBLEMS[currentProblemIndex].correctV0Text;
    textSpan.textContent = '✗ チャレンジ失敗！ 正解は ' + correctV0 + ' m/s でした。 ';
    
    const fireBtn = document.getElementById('fireBtn');
    fireBtn.disabled = true;
    fireBtn.style.opacity = '0.5';
    fireBtn.style.cursor = 'not-allowed';
    
    const nextBtn = document.createElement('button');
    nextBtn.className = 'btn btn-next';
    nextBtn.textContent = isLast ? '🏆 全問終了！結果発表 ➔' : '次の問題へ進む ➔';
    
    nextBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      finishAndLogProblem(currentProblemIndex);
      if (isLast) {
        showGameClear();
      } else {
        loadProblem(currentProblemIndex + 1);
      }
    });
    resultBanner.appendChild(nextBtn);
  }
  
  resultBanner.className   = 'result-banner ' + type;
  resultBanner.classList.remove('hidden');
}

function hideResult() {
  resultBanner.className   = 'result-banner hidden';
  resultBanner.innerHTML   = '';
}

function showGameClear(isInterrupted = false) {
  let correctCount = 0;
  for (let i = 0; i < PROBLEMS.length; i++) {
    if (problemStats[i].cleared) {
      correctCount++;
    }
  }
  
  const titleEl = document.getElementById('clearTitle');
  const subtitleEl = document.getElementById('clearSubtitle');
  if (isInterrupted) {
    titleEl.textContent = '🏁 リザルト（中断）';
    subtitleEl.textContent = 'シミュレーションを中断しました。';
  } else {
    titleEl.textContent = '🏆 GAME CLEAR! 🏆';
    subtitleEl.textContent = 'すべての問題をクリアしました！';
  }
  
  document.getElementById('correctCount').textContent = correctCount + ' / ' + PROBLEMS.length + ' 問';
  document.getElementById('totalFires').textContent = totalFires;
  document.getElementById('totalHints').textContent = totalHints;
  document.getElementById('clearOverlay').classList.remove('hidden');
}

// ゲームクリアオーバーレイのリスタートボタン
document.getElementById('restartGameBtn').addEventListener('click', function() {
  document.getElementById('clearOverlay').classList.add('hidden');
  totalFires = 0;
  totalHints = 0;
  
  PROBLEMS = generateRandomProblems();
  problemStats = PROBLEMS.map(() => ({
    cleared: false,
    hintsUsed: 0,
    attempts: 0,
    calcUsed: 0,
    startTime: null,
    v0History: [],
    calcHistory: []
  }));
  
  loadProblem(0);
});

// ─────────────────────────────────────────────
// 8. 初期ロード・スタートオーバーレイ
// ─────────────────────────────────────────────
document.getElementById('startGameBtn').addEventListener('click', function() {
  const input = document.getElementById('usernameInput').value.trim();
  if (!input) {
    alert('ユーザーネームを入力してください。');
    return;
  }
  currentUsername = input;
  document.getElementById('startOverlay').classList.add('hidden');
  addLog('SessionStart', '', 'User=' + currentUsername);
  
  PROBLEMS = generateRandomProblems();
  problemStats = PROBLEMS.map(() => ({
    cleared: false,
    hintsUsed: 0,
    attempts: 0,
    calcUsed: 0,
    startTime: null,
    v0History: [],
    calcHistory: []
  }));
  
  loadProblem(0);
});

// Enterキーでもスタートできるように
document.getElementById('usernameInput').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') {
    document.getElementById('startGameBtn').click();
  }
});

// ─────────────────────────────────────────────
// 9. ボタンイベント
// ─────────────────────────────────────────────

// 発射
document.getElementById('fireBtn').addEventListener('click', function () {
  const parsed = parseFloat(document.getElementById('v0Input').value);
  if (isNaN(parsed) || parsed <= 0) {
    alert('初速（v₀）に正の数値を入力してください。');
    return;
  }
  
  totalFires++;
  attemptsRemaining--;
  problemStats[currentProblemIndex].attempts++;
  if (problemStats[currentProblemIndex].v0History) {
    problemStats[currentProblemIndex].v0History.push(parsed);
  }
  updateAttemptsUI();
  
  stopAnimation();
  playFireSound();
  hideResult();
  trail.length = 0;
  physTime = 0;
  lastTS   = null;
  v0       = parsed;
  addLog('Fire', v0, 'θ=' + THETA_DEG + '° x_target=' + X_TARGET.toFixed(2) + 'm');
  isRunning = true;
  animId    = requestAnimationFrame(animate);
});

// リセット
document.getElementById('resetBtn').addEventListener('click', function () {
  resetSimulation();
});

// ヒント
document.getElementById('hintBtn').addEventListener('click', function () {
  const hintArea  = document.getElementById('hintArea');
  const hintText  = document.getElementById('hintText');
  const currentV0 = parseFloat(document.getElementById('v0Input').value);
  const inputStr  = isNaN(currentV0) ? '（未入力）' : currentV0 + ' m/s';

  if (hintArea.classList.contains('hidden')) {
    totalHints++;
    problemStats[currentProblemIndex].hintsUsed++;
  }

  hintText.innerHTML = PROBLEMS[currentProblemIndex].hint(inputStr);
  hintArea.classList.remove('hidden');
  addLog('Hint', isNaN(currentV0) ? '' : currentV0, '');
});

// 中断
document.getElementById('interruptBtn').addEventListener('click', function () {
  if (confirm('現在の問題で中断し、結果を確認しますか？')) {
    stopAnimation();
    hideResult();
    addLog('Interrupt', '', 'Problem=' + PROBLEMS[currentProblemIndex].num);
    finishAndLogProblem(currentProblemIndex);
    showGameClear(true);
  }
});



// ─────────────────────────────────────────────
// 10. 計算スペース（Scratchpad）ロジック
// ─────────────────────────────────────────────
const calcInput    = document.getElementById('calcInput');
const calcBtn      = document.getElementById('calcBtn');
const calcClearBtn = document.getElementById('calcClearBtn');
const calcHistory  = document.getElementById('calcHistory');

// 初期状態で履歴が空であることを示すプレースホルダーを表示
function updateHistoryPlaceholder() {
  if (calcHistory.children.length === 0) {
    calcHistory.innerHTML = '<div style="color: var(--color-muted); text-align: center; padding-top: 1.5rem; font-style: italic;">計算履歴はありません</div>';
  }
}
updateHistoryPlaceholder();

function addCalcToHistory(expr, result) {
  // プレースホルダーを消去
  if (calcHistory.querySelector('div[style*="font-style: italic"]')) {
    calcHistory.innerHTML = '';
  }

  const item = document.createElement('div');
  item.className = 'calc-history-item';

  const exprSpan = document.createElement('span');
  exprSpan.className = 'expr';
  exprSpan.textContent = expr + ' = ';

  const resSpan = document.createElement('span');
  resSpan.className = 'res';
  resSpan.title = 'クリックして初速(v0)に入力';
  resSpan.textContent = typeof result === 'number' ? result.toFixed(4).replace(/\.?0+$/, '') : result;

  // クリックして v0 に設定するインタラクション
  resSpan.addEventListener('click', function() {
    const v0Input = document.getElementById('v0Input');
    v0Input.value = resSpan.textContent;
    addLog('SetV0FromCalc', resSpan.textContent, 'expr=' + expr);
  });

  item.appendChild(exprSpan);
  item.appendChild(resSpan);
  calcHistory.appendChild(item);

  // 自動スクロール
  calcHistory.scrollTop = calcHistory.scrollHeight;
}

function runCalculation() {
  const expr = calcInput.value.trim();
  if (!expr) return;

  try {
    const result = safeEvaluate(expr);
    addCalcToHistory(expr, result);
    calcInput.value = ''; // 入力をクリア
    problemStats[currentProblemIndex].calcUsed++;
    if (problemStats[currentProblemIndex].calcHistory) {
      problemStats[currentProblemIndex].calcHistory.push(expr);
      if (problemStats[currentProblemIndex].calcHistory.length > 10) {
        problemStats[currentProblemIndex].calcHistory.shift();
      }
    }
    addLog('Calculate', expr, 'result=' + result);
  } catch (error) {
    alert('計算エラー: ' + error.message);
    addLog('CalculateError', expr, 'error=' + error.message);
  }
}

function safeEvaluate(input) {
  let expr = input.replace(/\s+/g, '');
  
  // 使える関数と安全な文字のバリデーション
  let validationExpr = expr
    .replace(/sqrt/g, '')
    .replace(/abs/g, '')
    .replace(/round/g, '')
    .replace(/floor/g, '')
    .replace(/ceil/g, '');
  
  if (!expr) {
    throw new Error('式が空です。');
  }
  
  if (!/^[0-9+\-*/.()^]+$/.test(validationExpr)) {
    throw new Error('使用できない文字や関数が含まれています。');
  }

  // 括弧のバランスチェック
  let openParentheses = (expr.match(/\(/g) || []).length;
  let closeParentheses = (expr.match(/\)/g) || []).length;
  if (openParentheses !== closeParentheses) {
    throw new Error('括弧の左右の数が一致しません。');
  }

  // 関数をMathオブジェクトにマッピング、^を**に変換
  expr = expr
    .replace(/\^/g, '**')
    .replace(/sqrt\(/g, 'Math.sqrt(')
    .replace(/abs\(/g, 'Math.abs(')
    .replace(/round\(/g, 'Math.round(')
    .replace(/floor\(/g, 'Math.floor(')
    .replace(/ceil\(/g, 'Math.ceil(');

  try {
    const fn = new Function('return ' + expr);
    const res = fn();
    if (typeof res !== 'number' || isNaN(res) || !isFinite(res)) {
      throw new Error('無効な数値演算です。');
    }
    return res;
  } catch (e) {
    throw new Error('数式が正しくありません。');
  }
}

// 計算ボタンのクリック
calcBtn.addEventListener('click', runCalculation);

// 平方根(ルート)ボタンのクリック
document.getElementById('calcSqrtBtn').addEventListener('click', function() {
  calcInput.value += 'sqrt(';
  calcInput.focus();
});

// 入力欄でのEnterキー押下
calcInput.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') {
    runCalculation();
  }
});

// 履歴削除ボタンのクリック
calcClearBtn.addEventListener('click', function() {
  if (calcHistory.children.length === 0 || calcHistory.querySelector('div[style*="font-style: italic"]')) {
    return;
  }
  if (confirm('履歴をクリアしますか？')) {
    calcHistory.innerHTML = '';
    updateHistoryPlaceholder();
    addLog('ClearCalcHistory', '');
  }
});


