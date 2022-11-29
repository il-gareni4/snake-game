// Реализация связного списка

class Node {
  constructor(value) {
    this.value = value;
    this.next = null;
    this.prev = null;
  }
}

class LinkedList {
  constructor() {
    this.head = null;
    this.tail = null;
    this.length = 0;
  }

  insertFirst(value) {
    const node = new Node(value);

    if (this.head) {
      node.next = this.head;
      this.head.prev = node;
      this.head = node;
    } else {
      this.head = node;
      this.tail = node;
    }

    this.length++;
  }

  append(value) {
    const node = new Node(value);

    if (this.tail) {
      node.prev = this.tail;
      this.tail.next = node;
      this.tail = node;
    } else {
      this.head = node;
      this.tail = node;
    }

    this.length++;
  }

  pop() {
    const current = this.tail;
    this.tail = this.tail.prev;
    this.tail.next = null;
    this.length--;

    return current.value;
  }

  clear() {
    this.head = null;
    this.tail = null;
    this.length = 0;
  }
}

// УТИЛИТАРНЫЕ ФУНКЦИИ

// Возвращает минуты и секунды, прошедшие между первой и второй датой
function timePassed(d1, d2) {
  const dateDiff = d1 - d2;
  const minutesPassed = Math.floor(dateDiff / (60 * 1000));
  const secondsPassed = Math.floor((dateDiff / 1000) % 60);
  return `${minutesPassed}:${secondsPassed <= 9 ? "0" + secondsPassed : secondsPassed}`;
}

// УЗЛЫ (NODES)

const canvas = document.getElementById("game-canvas");
const startButton = document.getElementById("start-button");
const statsBestScore = document.getElementById("best-score");
const statsCurrentScore = document.getElementById("current-score");
const statsGameTime = document.getElementById("game-time");

const ctx = canvas.getContext("2d");
let raf;

// Константы

const COLORS = {
  snakeColor: "#247AFB",
  foodColor: "#F84F4E",
};
const CELL_SIZE = 48;
const X_CELLS = 10;
const Y_CELLS = 10;

// ЛОГИКА ИГРЫ

// Класс точки. Хранит координаты по оси x и y
class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}

// Класс точки с направлением. Хранит координаты точки и вектор направления
class PointDir {
  constructor(x, y, xDir, yDir) {
    this.point = new Point(x, y);
    this.direction = new Point(xDir, yDir);
  }

  pointPlusDirection() {
    return new PointDir(
      this.point.x + this.direction.x,
      this.point.y + this.direction.y,
      this.direction.x,
      this.direction.y
    );
  }
}

// Основной класс игры, в котором реализованы методы изменения состояния игры и её отрисовки
class Game {
  constructor(context) {
    this.ctx = context; // Контекст, в котором будет рисоваться игра
    this.raf = null;
    this.stats = {
      started: 0, // timestamp начала игры
      score: 0, // Счёт игры
      bestScore: 0, // Счёт лучшей игры
    };
    this.lastMove = 0; // Время, когда был сделан последний ход змеи
    this.snakeSpeed = 150; // Интервал движения змеи (в миллисекундах)
    this.foodPosition = new Point(0, 0); // Позиция еды
    this.gameOver = false; // Закончена ли игра

    this.snake = new LinkedList(); // Змея, представленная в виде связного списка

    // Функция, нужная для корректного добавления и удаления слушателя событий
    this.onKeyPress = this.handleKeyDown.bind(this);
  }

  update() {
    statsGameTime.innerText = timePassed(Date.now(), this.stats.started);

    this.moveSnake();
    this.checkSnakeCollision();
    if (!this.gameOver && this.isFoodEated()) {
      this.genFood();
      statsCurrentScore.innerText = ++this.stats.score;
    }

    this.draw();
    if (this.gameOver) {
      this.stop();
    } else this.raf = requestAnimationFrame(this.update.bind(this));
  }

  genFood() {
    const snakePositions = new Array(X_CELLS * Y_CELLS);
    let snakePart = this.snake.head;
    while (snakePart) {
      snakePositions[snakePart.value.point.x + snakePart.value.point.y * X_CELLS] = 1;
      snakePart = snakePart.next;
    }

    const emptyPositions = [];
    for (let x = 0; x < X_CELLS; x++) {
      for (let y = 0; y < Y_CELLS; y++) {
        if (!snakePositions[x + y * X_CELLS]) emptyPositions.push(new Point(x, y));
      }
    }
    const randomNum = Math.floor(Math.random() * emptyPositions.length);
    this.foodPosition = emptyPositions[randomNum];
  }

  handleKeyDown(event) {
    /* Движение на стрелочках. При нажатии нужной стрелочки устанавливает текущее направление головы, если это возможно */
    if (event.key === "ArrowUp") this.setSnakeDirection(new Point(0, -1));
    else if (event.key === "ArrowRight") this.setSnakeDirection(new Point(1, 0));
    else if (event.key === "ArrowDown") this.setSnakeDirection(new Point(0, 1));
    else if (event.key === "ArrowLeft") this.setSnakeDirection(new Point(-1, 0));
  }

  setSnakeDirection(dir) {
    const prevSnakePart = this.snake.head.next.value; // Получаем предыдущую часть змеи, чтобы узнать в каком напрвлении она двигалась
    // Если новое направление не противоположно предыдущему, то устанавливаем новое направление
    if (prevSnakePart.direction.x + dir.x !== 0 && prevSnakePart.direction.y + dir.y !== 0)
      this.snake.head.value.direction = dir;
  }

  moveSnake() {
    if (Math.floor(Date.now() / this.snakeSpeed) > Math.floor(this.lastMove / this.snakeSpeed)) {
      this.lastMove = Date.now();
      const nextPos = this.snake.head.value.pointPlusDirection(); // Получение новой позиции головы змеи
      // Если змея выходит за границы поля, то она оказывается в другой стороны поля
      if (nextPos.point.x >= X_CELLS) nextPos.point.x -= 10;
      if (nextPos.point.y >= Y_CELLS) nextPos.point.y -= 10;
      if (nextPos.point.x < 0) nextPos.point.x += 10;
      if (nextPos.point.y < 0) nextPos.point.y += 10;
      this.snake.insertFirst(nextPos);
      if (!this.isFoodEated()) this.snake.pop();
    }
  }

  checkSnakeCollision() {
    const snakeHeadPos = this.snake.head.value.point;
    let snakePart = this.snake.head.next;
    while (snakePart) {
      if (
        snakePart.value.point.x === snakeHeadPos.x &&
        snakePart.value.point.y === snakeHeadPos.y
      ) {
        this.gameOver = true;
      }
      snakePart = snakePart.next;
    }
  }

  isFoodEated() {
    const snakeHeadPos = this.snake.head.value.point;
    return snakeHeadPos.x === this.foodPosition.x && snakeHeadPos.y == this.foodPosition.y;
  }

  draw() {
    this.ctx.clearRect(0, 0, X_CELLS * CELL_SIZE, Y_CELLS * CELL_SIZE);

    this.drawSnake();
    this.drawFood();
  }

  drawSnake() {
    ctx.fillStyle = COLORS.snakeColor;

    let snakePart = this.snake.head;
    while (snakePart) {
      ctx.fillRect(
        snakePart.value.point.x * CELL_SIZE,
        snakePart.value.point.y * CELL_SIZE,
        CELL_SIZE,
        CELL_SIZE
      );
      snakePart = snakePart.next;
    }

    if (this.gameOver) {
      // Рисуем соприкосновение красным
      ctx.fillStyle = COLORS.foodColor;
      ctx.fillRect(
        this.snake.head.value.point.x * CELL_SIZE,
        this.snake.head.value.point.y * CELL_SIZE,
        CELL_SIZE,
        CELL_SIZE
      );
    }
  }

  drawFood() {
    ctx.fillStyle = COLORS.foodColor;
    ctx.beginPath();
    ctx.roundRect(
      this.foodPosition.x * CELL_SIZE + 16,
      this.foodPosition.y * CELL_SIZE + 16,
      16,
      16,
      4
    );
    ctx.closePath();
    ctx.fill();
  }

  start() {
    this.raf = requestAnimationFrame(this.update.bind(this));
    this.stats.started = Date.now();
    this.lastMove = Date.now();
    this.gameOver = false;

    this.snake.clear();
    this.snake.insertFirst(new PointDir(1, 0, 1, 0));
    this.snake.insertFirst(new PointDir(0, 0, 1, 0));
    this.genFood();

    statsCurrentScore.innerText = this.stats.score = 0;
    startButton.innerText = "Закончить игру";

    window.addEventListener("keydown", this.onKeyPress);
  }

  stop() {
    cancelAnimationFrame(this.raf);
    this.raf = null;

    if (this.stats.score > this.stats.bestScore)
      statsBestScore.innerText = this.stats.bestScore = this.stats.score;
    startButton.innerText = "Начать игру";

    window.removeEventListener("keydown", this.onKeyPress);
  }
}

const gameInstance = new Game(ctx);
startButton.addEventListener("click", () => {
  if (gameInstance.raf) gameInstance.stop();
  else gameInstance.start();
});
