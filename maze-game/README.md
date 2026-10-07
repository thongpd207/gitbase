# Mê Cung Mana

Game mê cung chạy trên trình duyệt (HTML + JavaScript thuần, không cần cài đặt).

## Luật chơi

- Khởi đầu người chơi có một lượng mana (tuỳ màn: 100 / 120 / 150 / 180).
- Mục tiêu: đi từ góc trên-trái tới **lối ra** (ô xanh lá) ở góc dưới-phải.
- Trong mê cung có các **checkpoint** (ô tím, con số = mana cần trả).
  - Đi vào checkpoint sẽ bị trừ mana; trả 1 lần thì checkpoint mở vĩnh viễn.
  - Không đủ mana thì không qua được checkpoint đó (ô chuyển đỏ sẫm).
- **Thua** khi mana về 0 mà chưa tới lối ra, hoặc khi mana còn lại không còn đủ để tới lối ra.
- Mê cung có nhiều đường đi → hãy chọn đường tốn ít mana nhất.
- Màn 3, 4 có sương mù: chỉ thấy các ô quanh mình, phải tự dò tìm lối ra.
- Mỗi màn sinh ngẫu nhiên nhưng luôn đảm bảo thắng được với mana ban đầu.

## Chạy game

Mở file `index.html` bằng trình duyệt.

Điều khiển: phím mũi tên / WASD, nút bấm trên màn hình, hoặc vuốt (điện thoại).

## Tuỳ chỉnh

Sửa mảng `LEVELS` trong `js/maze.js`:

| Thuộc tính | Ý nghĩa |
|---|---|
| `width`, `height` | Kích thước mê cung (số ô) |
| `startMana` | Mana khởi đầu |
| `checkpoints` | Số checkpoint |
| `minCost`, `maxCost` | Khoảng mana cần trả cho mỗi checkpoint |
| `braid` | Tỉ lệ mở thêm tường (càng cao càng nhiều đường đi) |
| `fog` | Bán kính tầm nhìn (0 = không sương mù) |

## Cấu trúc

- `js/maze.js` – logic game (sinh mê cung, checkpoint, mana, thắng/thua), không phụ thuộc DOM.
- `js/game.js` – vẽ canvas và xử lý điều khiển.
- `tests/maze.test.js` – unit test, chạy bằng `npm test` (Node 18+).
