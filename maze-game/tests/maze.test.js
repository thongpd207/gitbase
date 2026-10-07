const test = require('node:test');
const assert = require('node:assert');
const Core = require('../js/maze.js');

// Dựng một màn chơi nhỏ thủ công: hành lang 1x4 thẳng, start (0,0) -> exit (3,0)
function corridorLevel(costs, startMana) {
  const config = { width: 4, height: 1, startMana, fog: 0 };
  const maze = { width: 4, height: 1, walls: new Array(4).fill(15) };
  const level = {
    config, maze, start: { x: 0, y: 0 }, exit: { x: 3, y: 0 }, checkpoints: {}
  };
  for (let x = 0; x < 3; x++) {
    maze.walls[x] &= ~Core.WALL.E;
    maze.walls[x + 1] &= ~Core.WALL.W;
  }
  Object.keys(costs).forEach((i) => { level.checkpoints[i] = { cost: costs[i] }; });
  return level;
}

function gameFrom(level) {
  return {
    level, player: { ...level.start }, mana: level.config.startMana,
    paid: {}, revealed: {}, moves: 0, manaSpent: 0, status: 'playing', message: ''
  };
}

test('mê cung sinh ra liên thông toàn bộ (mọi ô tới được lối ra)', () => {
  const rng = Core.createRng(42);
  const maze = Core.generateMaze(15, 15, rng, 0);
  const seen = new Set([0]);
  const queue = [[0, 0]];
  while (queue.length) {
    const [x, y] = queue.shift();
    for (const dir of Object.keys(Core.DIRS)) {
      if (!Core.canPass(maze, x, y, dir)) continue;
      const nx = x + Core.DIRS[dir].dx, ny = y + Core.DIRS[dir].dy;
      const i = Core.idx(maze, nx, ny);
      if (!seen.has(i)) { seen.add(i); queue.push([nx, ny]); }
    }
  }
  assert.strictEqual(seen.size, 15 * 15);
});

test('mọi màn đều thắng được với mana ban đầu', () => {
  Core.LEVELS.forEach((config) => {
    for (let seed = 1; seed <= 30; seed++) {
      const level = Core.createLevel(config, seed);
      const route = Core.cheapestRoute(level, 0, 0, null);
      assert.ok(route.cost < config.startMana, `${config.name} seed ${seed}: cần ${route.cost}`);
    }
  });
});

test('cùng seed cho ra cùng mê cung', () => {
  const a = Core.createLevel(Core.LEVELS[1], 123);
  const b = Core.createLevel(Core.LEVELS[1], 123);
  assert.deepStrictEqual(a.maze.walls, b.maze.walls);
  assert.deepStrictEqual(a.checkpoints, b.checkpoints);
});

test('đi qua checkpoint trừ mana, đi lại lần 2 không trừ nữa', () => {
  const game = gameFrom(corridorLevel({ 1: 30 }, 100));
  assert.strictEqual(Core.move(game, 'right').event, 'paid');
  assert.strictEqual(game.mana, 70);
  Core.move(game, 'left');
  Core.move(game, 'right');
  assert.strictEqual(game.mana, 70);
});

test('trả mana qua nhiều checkpoint rồi tới lối ra thì thắng', () => {
  const game = gameFrom(corridorLevel({ 1: 30, 2: 50 }, 100));
  // Còn 100 mà cần tổng 80 -> qua được
  Core.move(game, 'right');
  const r = Core.move(game, 'right');
  assert.strictEqual(r.event, 'paid');
  assert.strictEqual(game.mana, 20);
  assert.strictEqual(Core.move(game, 'right').event, 'won');
});

test('bị chặn khi mana nhỏ hơn cost', () => {
  const level = corridorLevel({ 1: 30 }, 20);
  const game = gameFrom(level);
  const r = Core.move(game, 'right');
  assert.strictEqual(r.event, 'no-mana');
  assert.deepStrictEqual(game.player, { x: 0, y: 0 });
});

test('hết mana mà chưa tới lối ra thì thua', () => {
  const game = gameFrom(corridorLevel({ 1: 50 }, 50));
  const r = Core.move(game, 'right');
  assert.strictEqual(r.event, 'lost');
  assert.strictEqual(game.status, 'lost');
  assert.strictEqual(Core.move(game, 'right').event, 'over');
});

test('thua sớm khi mana còn lại không đủ cho đường rẻ nhất tới lối ra', () => {
  const game = gameFrom(corridorLevel({ 1: 30, 2: 50 }, 70));
  const r = Core.move(game, 'right'); // còn 40 < 50
  assert.strictEqual(r.event, 'lost');
});

test('đụng tường thì không di chuyển', () => {
  const game = gameFrom(corridorLevel({}, 10));
  assert.strictEqual(Core.move(game, 'up').event, 'blocked');
  assert.strictEqual(Core.move(game, 'left').event, 'blocked');
  assert.strictEqual(game.moves, 0);
});
