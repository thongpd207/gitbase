/*
 * Logic thuần của game mê cung (không phụ thuộc DOM) để có thể test bằng Node.
 * - Sinh mê cung ngẫu nhiên có seed (recursive backtracker + mở thêm tường tạo vòng).
 * - Đặt checkpoint, mỗi checkpoint tốn mana để đi qua (trả 1 lần, sau đó mở vĩnh viễn).
 * - Thua khi mana về 0 hoặc mana còn lại không đủ để tới lối ra.
 */
(function (root) {
  'use strict';

  // Bitmask tường của mỗi ô
  var N = 1, E = 2, S = 4, W = 8;
  var DIRS = {
    up: { dx: 0, dy: -1, wall: N, opposite: S },
    right: { dx: 1, dy: 0, wall: E, opposite: W },
    down: { dx: 0, dy: 1, wall: S, opposite: N },
    left: { dx: -1, dy: 0, wall: W, opposite: E }
  };

  var LEVELS = [
    { name: 'Màn 1', width: 8, height: 8, startMana: 100, checkpoints: 6, minCost: 10, maxCost: 30, braid: 0.15, fog: 0 },
    { name: 'Màn 2', width: 12, height: 12, startMana: 120, checkpoints: 12, minCost: 10, maxCost: 40, braid: 0.12, fog: 0 },
    { name: 'Màn 3', width: 16, height: 16, startMana: 150, checkpoints: 20, minCost: 15, maxCost: 50, braid: 0.1, fog: 3 },
    { name: 'Màn 4', width: 20, height: 20, startMana: 180, checkpoints: 30, minCost: 15, maxCost: 60, braid: 0.1, fog: 2 }
  ];

  // PRNG có seed (mulberry32) để màn chơi tái lập được
  function createRng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function randInt(rng, min, max) {
    return min + Math.floor(rng() * (max - min + 1));
  }

  function idx(maze, x, y) {
    return y * maze.width + x;
  }

  function inBounds(maze, x, y) {
    return x >= 0 && y >= 0 && x < maze.width && y < maze.height;
  }

  function canPass(maze, x, y, dir) {
    var d = DIRS[dir];
    return inBounds(maze, x + d.dx, y + d.dy) && (maze.walls[idx(maze, x, y)] & d.wall) === 0;
  }

  function removeWall(maze, x, y, dir) {
    var d = DIRS[dir];
    maze.walls[idx(maze, x, y)] &= ~d.wall;
    maze.walls[idx(maze, x + d.dx, y + d.dy)] &= ~d.opposite;
  }

  function generateMaze(width, height, rng, braid) {
    var maze = {
      width: width,
      height: height,
      walls: new Array(width * height).fill(N | E | S | W)
    };
    var visited = new Array(width * height).fill(false);
    var stack = [{ x: 0, y: 0 }];
    visited[0] = true;
    var names = Object.keys(DIRS);

    while (stack.length) {
      var cur = stack[stack.length - 1];
      var options = names.filter(function (name) {
        var d = DIRS[name];
        var nx = cur.x + d.dx, ny = cur.y + d.dy;
        return inBounds(maze, nx, ny) && !visited[idx(maze, nx, ny)];
      });
      if (!options.length) {
        stack.pop();
        continue;
      }
      var pick = options[Math.floor(rng() * options.length)];
      var dd = DIRS[pick];
      removeWall(maze, cur.x, cur.y, pick);
      visited[idx(maze, cur.x + dd.dx, cur.y + dd.dy)] = true;
      stack.push({ x: cur.x + dd.dx, y: cur.y + dd.dy });
    }

    // Mở thêm một số tường để có nhiều đường đi -> người chơi phải chọn đường "rẻ" mana
    for (var y = 0; y < height; y++) {
      for (var x = 0; x < width; x++) {
        if (x < width - 1 && rng() < braid) removeWall(maze, x, y, 'right');
        if (y < height - 1 && rng() < braid) removeWall(maze, x, y, 'down');
      }
    }
    return maze;
  }

  /*
   * Dijkstra: chi phí mana nhỏ nhất để đi từ (sx,sy) tới lối ra.
   * Đi vào ô checkpoint chưa trả tiền sẽ tốn cost của checkpoint đó.
   * Trả về { cost, path } (path là danh sách ô), cost = Infinity nếu không tới được.
   */
  function cheapestRoute(level, sx, sy, paid) {
    var maze = level.maze;
    var total = maze.width * maze.height;
    var dist = new Array(total).fill(Infinity);
    var prev = new Array(total).fill(-1);
    var done = new Array(total).fill(false);
    var start = idx(maze, sx, sy);
    var target = idx(maze, level.exit.x, level.exit.y);
    dist[start] = 0;

    for (;;) {
      var u = -1;
      for (var i = 0; i < total; i++) {
        if (!done[i] && dist[i] !== Infinity && (u === -1 || dist[i] < dist[u])) u = i;
      }
      if (u === -1 || u === target) break;
      done[u] = true;
      var ux = u % maze.width, uy = Math.floor(u / maze.width);
      for (var name in DIRS) {
        if (!canPass(maze, ux, uy, name)) continue;
        var v = idx(maze, ux + DIRS[name].dx, uy + DIRS[name].dy);
        var cp = level.checkpoints[v];
        var step = cp && !(paid && paid[v]) ? cp.cost : 0;
        if (dist[u] + step < dist[v]) {
          dist[v] = dist[u] + step;
          prev[v] = u;
        }
      }
    }

    var path = [];
    if (dist[target] !== Infinity) {
      for (var c = target; c !== -1; c = prev[c]) path.unshift(c);
    }
    return { cost: dist[target], path: path };
  }

  /*
   * Tạo một màn chơi. Đảm bảo màn luôn thắng được: chi phí rẻ nhất < startMana
   * (thắng cần còn > 0 mana khi chưa tới đích), và ưu tiên màn "có thử thách":
   * buộc phải trả mana cho ít nhất một checkpoint.
   */
  function createLevel(config, seed) {
    var rng = createRng(seed);
    var best = null;

    for (var attempt = 0; attempt < 60; attempt++) {
      var maze = generateMaze(config.width, config.height, rng, config.braid);
      var level = {
        config: config,
        seed: seed,
        maze: maze,
        start: { x: 0, y: 0 },
        exit: { x: config.width - 1, y: config.height - 1 },
        checkpoints: {}
      };

      var cells = [];
      for (var i = 0; i < config.width * config.height; i++) cells.push(i);
      cells = cells.filter(function (c) {
        return c !== idx(maze, level.start.x, level.start.y) && c !== idx(maze, level.exit.x, level.exit.y);
      });
      // Xáo trộn rồi lấy n ô đầu làm checkpoint
      for (var j = cells.length - 1; j > 0; j--) {
        var k = Math.floor(rng() * (j + 1));
        var tmp = cells[j]; cells[j] = cells[k]; cells[k] = tmp;
      }
      cells.slice(0, config.checkpoints).forEach(function (c) {
        level.checkpoints[c] = { cost: randInt(rng, config.minCost, config.maxCost) };
      });

      var route = cheapestRoute(level, level.start.x, level.start.y, null);
      level.minManaNeeded = route.cost;
      if (route.cost < config.startMana) {
        if (route.cost > 0) return level;
        if (!best) best = level;
      }
    }

    if (best) return best;

    // Dự phòng (hầu như không xảy ra): mê cung không có checkpoint
    var fallback = generateMaze(config.width, config.height, rng, config.braid);
    var lvl = {
      config: config, seed: seed, maze: fallback,
      start: { x: 0, y: 0 }, exit: { x: config.width - 1, y: config.height - 1 },
      checkpoints: {}
    };
    lvl.minManaNeeded = 0;
    return lvl;
  }

  function createGame(config, seed) {
    var level = createLevel(config, seed);
    var game = {
      level: level,
      player: { x: level.start.x, y: level.start.y },
      mana: config.startMana,
      paid: {},
      revealed: {},
      moves: 0,
      manaSpent: 0,
      status: 'playing',
      message: 'Tìm lối ra! Đi qua checkpoint sẽ tốn mana.'
    };
    reveal(game);
    return game;
  }

  // Sương mù: mở các ô trong bán kính fog quanh người chơi
  function reveal(game) {
    var maze = game.level.maze;
    var r = game.level.config.fog;
    if (!r) return;
    for (var dy = -r; dy <= r; dy++) {
      for (var dx = -r; dx <= r; dx++) {
        var x = game.player.x + dx, y = game.player.y + dy;
        if (inBounds(maze, x, y)) game.revealed[idx(maze, x, y)] = true;
      }
    }
  }

  function isRevealed(game, x, y) {
    if (!game.level.config.fog) return true;
    return !!game.revealed[idx(game.level.maze, x, y)];
  }

  /*
   * Thử di chuyển người chơi. Trả về { ok, event } với event:
   * 'blocked' (tường), 'no-mana' (không đủ mana qua checkpoint), 'paid', 'move', 'won', 'lost'.
   */
  function move(game, dir) {
    if (game.status !== 'playing') return { ok: false, event: 'over' };
    var maze = game.level.maze;
    var p = game.player;
    if (!DIRS[dir] || !canPass(maze, p.x, p.y, dir)) {
      return { ok: false, event: 'blocked' };
    }

    var nx = p.x + DIRS[dir].dx, ny = p.y + DIRS[dir].dy;
    var target = idx(maze, nx, ny);
    var cp = game.level.checkpoints[target];
    var event = 'move';

    if (cp && !game.paid[target]) {
      if (game.mana < cp.cost) {
        game.message = 'Không đủ mana! Checkpoint cần ' + cp.cost + ' mana, bạn chỉ còn ' + game.mana + '.';
        return { ok: false, event: 'no-mana', cost: cp.cost };
      }
      game.mana -= cp.cost;
      game.manaSpent += cp.cost;
      game.paid[target] = true;
      event = 'paid';
      game.message = 'Đã trả ' + cp.cost + ' mana để qua checkpoint.';
    } else {
      game.message = '';
    }

    p.x = nx;
    p.y = ny;
    game.moves++;
    reveal(game);

    if (nx === game.level.exit.x && ny === game.level.exit.y) {
      game.status = 'won';
      game.message = 'Bạn đã tìm thấy lối ra với ' + game.mana + ' mana còn lại!';
      return { ok: true, event: 'won' };
    }

    if (game.mana <= 0) {
      game.status = 'lost';
      game.message = 'Hết mana mà chưa tìm được lối ra. Bạn đã thua!';
      return { ok: true, event: 'lost' };
    }

    var route = cheapestRoute(game.level, nx, ny, game.paid);
    if (route.cost > game.mana) {
      game.status = 'lost';
      game.message = 'Mana còn lại (' + game.mana + ') không đủ để tới lối ra. Bạn đã thua!';
      return { ok: true, event: 'lost' };
    }

    return { ok: true, event: event };
  }

  var api = {
    WALL: { N: N, E: E, S: S, W: W },
    DIRS: DIRS,
    LEVELS: LEVELS,
    createRng: createRng,
    generateMaze: generateMaze,
    cheapestRoute: cheapestRoute,
    createLevel: createLevel,
    createGame: createGame,
    move: move,
    canPass: canPass,
    isRevealed: isRevealed,
    idx: idx
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MazeCore = api;
})(this);
