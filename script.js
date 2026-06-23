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
// 1. 物理定数・問題パラメータ & 問題リスト
// ─────────────────────────────────────────────
const G           = 9.8;
const HIT_X_MARGIN = 0.3;

let PROBLEMS = [];

function generateRandomProblems() {
  const angles = [30, 45, 60];
  const tHits = [2, 3, 4];
  const v0_factors = [1, 1.5, 2, 2.5]; // 9.8の倍数

  const newProblems = [];
  
  for (let i = 1; i <= 3; i++) {
    const thetaDeg = angles[Math.floor(Math.random() * angles.length)];
    const tHit = tHits[Math.floor(Math.random() * tHits.length)];
    const base_v0 = 9.8 * v0_factors[Math.floor(Math.random() * v0_factors.length)];
    
    let xTargetStr = '';
    let xTargetVal = 0;
    let correctV0Text = '';
    let chips = [];
    let text = '';
    
    if (thetaDeg === 30) {
      const xCoef = base_v0 * tHit / 2;
      xTargetStr = Number.isInteger(xCoef) ? xCoef + '√3' : xCoef.toFixed(1) + '√3';
      xTargetVal = xCoef * Math.sqrt(3);
      correctV0Text = Number.isInteger(base_v0) ? base_v0.toString() : base_v0.toFixed(1);
      
      chips = [
        { text: "√3 ≈ 1.7321" },
        { text: "cos 30° = √3/2 ≈ 0.8660" },
        { text: "sin 30° = 0.5" },
        { text: "g = 9.8 m/s²" }
      ];
      
      text = `餌入りのボールとターゲットは <strong>${xTargetStr} m</strong> 離れている。<br>ボールを水平面から仰角 <strong>30°</strong> で投げ出し、<strong>${tHit} 秒後</strong>にターゲットに当てたい。<br>どのくらいの速度で投げ出せばよいか。<br><small>（空気抵抗は無視、重力加速度 g = 9.8 m/s²）</small>`;
      
    } else if (thetaDeg === 45) {
      const xVal = base_v0 * tHit;
      xTargetStr = Number.isInteger(xVal) ? xVal.toString() : xVal.toFixed(1);
      xTargetVal = xVal;
      
      const v0Approx = (base_v0 * Math.sqrt(2)).toFixed(2);
      const v0Exact = Number.isInteger(base_v0) ? base_v0 + '√2' : base_v0.toFixed(1) + '√2';
      correctV0Text = `${v0Approx} (または厳密値 ${v0Exact})`;
      
      chips = [
        { text: "√2 ≈ 1.4142" },
        { text: "cos 45° = √2/2 ≈ 0.7071" },
        { text: "sin 45° = √2/2 ≈ 0.7071" },
        { text: "g = 9.8 m/s²" }
      ];
      
      text = `ボールとターゲットの間には <strong>${xTargetStr} m</strong> の距離がある。<br>ボールを水平面から仰角 <strong>45°</strong> で投げ出し、<strong>${tHit} 秒後</strong>にターゲットに当てたい。<br>どのくらいの速度で投げ出せばよいか。<br><small>（空気抵抗は無視、重力加速度 g = 9.8 m/s²）</small>`;
      
    } else if (thetaDeg === 60) {
      const xCoef = base_v0 * tHit / 2;
      xTargetStr = Number.isInteger(xCoef) ? xCoef + '√3' : xCoef.toFixed(1) + '√3';
      xTargetVal = xCoef * Math.sqrt(3);
      
      const v0Approx = (base_v0 * Math.sqrt(3)).toFixed(2);
      const v0Exact = Number.isInteger(base_v0) ? base_v0 + '√3' : base_v0.toFixed(1) + '√3';
      correctV0Text = `${v0Approx} (または厳密値 ${v0Exact})`;
      
      chips = [
        { text: "√3 ≈ 1.7321" },
        { text: "cos 60° = 0.5" },
        { text: "sin 60° = √3/2 ≈ 0.8660" },
        { text: "g = 9.8 m/s²" }
      ];
      
      text = `ボールとターゲットは <strong>${xTargetStr} m</strong> 離れている。<br>ボールを水平面から仰角 <strong>60°</strong> で投げ出し、<strong>${tHit} 秒後</strong>にターゲットに当てたい。<br>どのくらいの速度で投げ出せばよいか。<br><small>（空気抵抗は無視、重力加速度 g = 9.8 m/s²）</small>`;
    }
    
    const hint = function(currentV0Str) {
      let cosValStr = '';
      if (thetaDeg === 30) cosValStr = '&radic;3 / 2 &asymp; 0.8660';
      else if (thetaDeg === 45) cosValStr = '&radic;2 / 2 &asymp; 0.7071';
      else if (thetaDeg === 60) cosValStr = '0.5';
      
      let xApprox = xTargetVal.toFixed(2);
      let xDisplay = xTargetStr.includes('√') ? `&asymp; ${xApprox}` : `= ${xApprox}`;
      let cosDivVal = cosValStr.includes('&asymp;') ? cosValStr.split('&asymp;')[1].trim() : cosValStr;
      
      return '<ol>' +
        '<li>水平方向の運動方程式は<br>' +
        '<code>x = v&#8320; &times; cos(' + thetaDeg + '&deg;) &times; t</code><br>' +
        'この問題では <code>x ' + xDisplay + ' m</code>、' +
        '<code>t = ' + tHit + ' s</code> が既知です。</li>' +
        '<li>上式に数値を代入して <code>v&#8320;</code> を解いてみましょう：<br>' +
        '<code>' + xApprox + ' = v&#8320; &times; cos(' + thetaDeg + '&deg;) &times; ' + tHit + '</code><br>' +
        '<code>cos(' + thetaDeg + '&deg;) = ' + cosValStr + '</code></li>' +
        '<li>整理すると<br>' +
        '<code>v&#8320; = ' + xApprox + ' &divide; (' + cosDivVal + ' &times; ' + tHit + ') = ?</code><br>' +
        '計算した値を「初速 v&#8320;」欄に入力して「発射」してみよう！</li>' +
        '<li>鉛直方向の確認：<code>y = v&#8320;&times;sin(' + thetaDeg + '&deg;)&times;t &minus; &frac12;&times;g&times;t&sup2;</code><br>' +
        't = ' + tHit + ' s のとき y = 0 になっているか検算してみよう。</li>' +
        '</ol>' +
        '<p style="margin-top:0.7rem;color:#8b949e;font-size:0.82rem;">' +
        '&#x203B; あなたが入力した値：' + currentV0Str + '</p>';
    };

    newProblems.push({
      num: i,
      text: text,
      xTargetStr: xTargetStr,
      xTarget: xTargetVal,
      thetaDeg: thetaDeg,
      tHit: tHit,
      correctV0Text: correctV0Text,
      chips: chips,
      hint: hint
    });
  }
  
  return newProblems;
}

let currentProblemIndex = 0;
let totalFires = 0;
let totalHints = 0;
let attemptsRemaining = 3;
let currentUsername = '';
let problemStats = [];

let X_TARGET;
let THETA_DEG;
let THETA_RAD;
let T_HIT;

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
  
  X_TARGET = p.xTarget;
  THETA_DEG = p.thetaDeg;
  THETA_RAD = (THETA_DEG * Math.PI) / 180;
  T_HIT = p.tHit;
  
  PHYS_W     = X_TARGET * 1.18;
  const v0Est = X_TARGET / (Math.cos(THETA_RAD) * T_HIT);
  MAX_PHYS_H = Math.pow(v0Est * Math.sin(THETA_RAD), 2) / (2 * G) * 1.3 + 2;
  SCALE_X    = (CANVAS_W - MARGIN_X * 2) / PHYS_W;
  SCALE_Y    = (GROUND_Y - MARGIN_Y) / MAX_PHYS_H;
  
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

function addLog(action, inputV0, detail = '') {
  const ts = new Date().toISOString().replace('T', ' ').replace('Z', '');
  const probNum = (action === 'SessionStart' || currentProblemIndex === undefined) ? '-' : PROBLEMS[currentProblemIndex].num;
  
  const logData = { timestamp: ts, username: currentUsername, problem: probNum, action, v0: inputV0, detail };
  logs.push(logData);

  // Send to server
  fetch('/api/log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(logData)
  }).catch(err => console.error('Failed to send log:', err));
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

  // 発射台
  const launchCv = toCanvas(0, 0);
  ctx.fillStyle = '#586069';
  ctx.fillRect(launchCv.x - 12, GROUND_Y - 24, 24, 24);

  // 仰角ガイド線
  const guideLen = 40;
  ctx.strokeStyle = 'rgba(47,129,247,0.4)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(launchCv.x, GROUND_Y - 24);
  ctx.lineTo(
    launchCv.x + guideLen * Math.cos(THETA_RAD),
    (GROUND_Y - 24) - guideLen * Math.sin(THETA_RAD)
  );
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#2f81f7';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('30°', launchCv.x + 28, GROUND_Y - 36);

  // ターゲット（ポール＋旗）
  const tCv = toCanvas(X_TARGET, 0);
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

  // 許容幅ガイド帯（±HIT_X_MARGIN m）
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

  // ターゲットラベル
  ctx.fillStyle = '#f85149';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('TARGET', tCv.x, GROUND_Y - 60);

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

  const px = v0 * Math.cos(THETA_RAD) * physTime;
  const py = v0 * Math.sin(THETA_RAD) * physTime - 0.5 * G * physTime * physTime;

  trail.push([px, py]);
  drawScene(px, py, trail);

  // 時刻ベース命中判定：t >= T_HIT になった瞬間に理論値で評価
  if (physTime >= T_HIT) {
    const xAtHit = v0 * Math.cos(THETA_RAD) * T_HIT;
    const xErr   = Math.abs(xAtHit - X_TARGET);
    stopAnimation();
    if (xErr <= HIT_X_MARGIN) {
      problemStats[currentProblemIndex].cleared = true;
      showResult('hit', '🎯 Hit!');
      addLog('Hit', v0, 'x_err=' + xErr.toFixed(3) + 'm');
    } else {
      const over = xAtHit > X_TARGET ? '飛びすぎ' : '届かない';
      showResult('miss', '✗ Miss（' + over + '）');
      addLog('Miss', v0, 'x_err=' + xErr.toFixed(3) + 'm  x=' + xAtHit.toFixed(2) + 'm');
    }
    return;
  }

  // 途中ミス：地面に落下
  if (py < -0.5) {
    stopAnimation();
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

function showGameClear() {
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
    attempts: 0
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
    attempts: 0
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
  updateAttemptsUI();
  
  stopAnimation();
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

// ログダウンロード
document.getElementById('downloadBtn').addEventListener('click', function () {
  if (confirm('サーバーに蓄積された全ユーザーのログ（all_logs.csv）をダウンロードしますか？')) {
    window.location.href = '/api/download_logs';
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
  
  if (!/^[0-9+\-*/.()]+$/.test(validationExpr)) {
    throw new Error('使用できない文字や関数が含まれています。');
  }

  // 括弧のバランスチェック
  let openParentheses = (expr.match(/\(/g) || []).length;
  let closeParentheses = (expr.match(/\)/g) || []).length;
  if (openParentheses !== closeParentheses) {
    throw new Error('括弧の左右の数が一致しません。');
  }

  // 関数をMathオブジェクトにマッピング
  expr = expr
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


