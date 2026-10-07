/* Phần giao diện: vẽ mê cung lên canvas, xử lý bàn phím / nút / vuốt. */
(function () {
  'use strict';

  var Core = window.MazeCore;
  var canvas = document.getElementById('canvas');
  var ctx = canvas.getContext('2d');
  var el = function (id) { return document.getElementById(id); };

  var levelIndex = 0;
  var seed = newSeed();
  var game = null;

  function newSeed() {
    return Math.floor(Math.random() * 0xffffffff);
  }

  function start() {
    game = Core.createGame(Core.LEVELS[levelIndex], seed);
    el('level-select').value = String(levelIndex);
    el('overlay').classList.add('hidden');
    resize();
    updateHud('');
  }

  function resize() {
    var size = canvas.clientWidth;
    var dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  function draw() {
    if (!game) return;
    var maze = game.level.maze;
    var size = canvas.clientWidth;
    var pad = 8;
    var cell = (size - pad * 2) / Math.max(maze.width, maze.height);
    var W = Core.WALL;

    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.translate(pad, pad);

    for (var y = 0; y < maze.height; y++) {
      for (var x = 0; x < maze.width; x++) {
        var px = x * cell, py = y * cell;
        var i = Core.idx(maze, x, y);

        if (!Core.isRevealed(game, x, y)) {
          ctx.fillStyle = '#0a0d1a';
          ctx.fillRect(px, py, cell + 0.5, cell + 0.5);
          continue;
        }

        var cp = game.level.checkpoints[i];
        if (x === game.level.exit.x && y === game.level.exit.y) {
          ctx.fillStyle = '#4ade80';
          ctx.fillRect(px + 2, py + 2, cell - 4, cell - 4);
        } else if (cp) {
          var paid = game.paid[i];
          var affordable = game.mana >= cp.cost;
          ctx.fillStyle = paid ? '#3f3a5c' : affordable ? '#a855f7' : '#7f1d3a';
          ctx.fillRect(px + 2, py + 2, cell - 4, cell - 4);
          if (!paid) {
            ctx.fillStyle = '#fff';
            ctx.font = 'bold ' + Math.max(8, Math.floor(cell * 0.4)) + 'px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(cp.cost), px + cell / 2, py + cell / 2 + 1);
          }
        }

        ctx.strokeStyle = '#8b93c9';
        ctx.lineWidth = Math.max(1.5, cell * 0.08);
        ctx.lineCap = 'round';
        var w = maze.walls[i];
        ctx.beginPath();
        if (w & W.N) { ctx.moveTo(px, py); ctx.lineTo(px + cell, py); }
        if (w & W.E) { ctx.moveTo(px + cell, py); ctx.lineTo(px + cell, py + cell); }
        if (w & W.S) { ctx.moveTo(px, py + cell); ctx.lineTo(px + cell, py + cell); }
        if (w & W.W) { ctx.moveTo(px, py); ctx.lineTo(px, py + cell); }
        ctx.stroke();
      }
    }

    // Người chơi
    var p = game.player;
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(p.x * cell + cell / 2, p.y * cell + cell / 2, cell * 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function updateHud(event) {
    var max = game.level.config.startMana;
    var ratio = Math.max(0, game.mana) / max;
    el('mana-text').textContent = game.mana + ' / ' + max;
    el('mana-fill').style.width = (ratio * 100) + '%';
    el('mana-fill').classList.toggle('low', ratio <= 0.25);
    el('moves').textContent = game.moves;
    el('spent').textContent = game.manaSpent;

    var msg = el('message');
    msg.textContent = game.message;
    msg.className = 'message' + (event === 'no-mana' || event === 'lost' ? ' warn' : event === 'won' ? ' good' : '');

    if (game.status !== 'playing') showOverlay();
  }

  function showOverlay() {
    var won = game.status === 'won';
    el('overlay-title').textContent = won ? '🎉 Chiến thắng!' : '💀 Thua rồi!';
    el('overlay-text').textContent = game.message + ' (Số bước: ' + game.moves + ')';
    el('overlay-next').style.display = won && levelIndex < Core.LEVELS.length - 1 ? '' : 'none';
    el('overlay').classList.remove('hidden');
  }

  function shake() {
    canvas.classList.remove('shake');
    void canvas.offsetWidth;
    canvas.classList.add('shake');
  }

  function doMove(dir) {
    if (!game) return;
    var result = Core.move(game, dir);
    if (result.event === 'blocked' || result.event === 'over') return;
    if (result.event === 'no-mana') shake();
    draw();
    updateHud(result.event);
  }

  // --- Điều khiển ---
  var KEYS = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    w: 'up', s: 'down', a: 'left', d: 'right',
    W: 'up', S: 'down', A: 'left', D: 'right'
  };
  document.addEventListener('keydown', function (e) {
    var dir = KEYS[e.key];
    if (!dir || e.target.tagName === 'SELECT') return;
    e.preventDefault();
    doMove(dir);
  });

  document.querySelectorAll('.dpad button').forEach(function (btn) {
    btn.addEventListener('click', function () { doMove(btn.dataset.dir); });
  });

  var touchStart = null;
  canvas.addEventListener('touchstart', function (e) {
    var t = e.touches[0];
    touchStart = { x: t.clientX, y: t.clientY };
  }, { passive: true });
  canvas.addEventListener('touchend', function (e) {
    if (!touchStart) return;
    var t = e.changedTouches[0];
    var dx = t.clientX - touchStart.x, dy = t.clientY - touchStart.y;
    touchStart = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
    doMove(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  });

  var select = el('level-select');
  Core.LEVELS.forEach(function (lv, i) {
    var opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = lv.name + ' (' + lv.width + 'x' + lv.height + ', ' + lv.startMana + ' mana)';
    select.appendChild(opt);
  });
  select.addEventListener('change', function () {
    levelIndex = Number(select.value);
    seed = newSeed();
    start();
  });

  el('btn-restart').addEventListener('click', start);
  el('overlay-restart').addEventListener('click', start);
  el('btn-new').addEventListener('click', function () { seed = newSeed(); start(); });
  el('overlay-next').addEventListener('click', function () {
    levelIndex = Math.min(levelIndex + 1, Core.LEVELS.length - 1);
    seed = newSeed();
    start();
  });
  window.addEventListener('resize', resize);

  start();
})();
