var game;

function Controls(left, right, up, down, tag){
  return {
    left: left,
    right: right,
    up: up,
    down: down,
    tag: tag
  };
}

function HUD(){
  return {
    draw(game, dt){
      var gameOver = false;
      push();
      textSize(20);
      gameOver = game.turns <= 0;

      noStroke();

      fill(game.players[0].fill);
      rect(370, 5, 20, 20);

      fill(game.players[1].fill);
      rect(370, 325, 20, 20);

      fill(0);

      text(`: ${game.players[0].points}`, 395, 20);
      text(`Turns left: ${Math.floor(game.turns / 2 )}`, 370, 45);
      text(`: ${game.players[1].points}`, 395, 340);
      text(`Turns left: ${Math.ceil(game.turns / 2)}`, 370, 320);

      if(!gameOver){
        fill(game.players[game.currentPlayer].fill);
        rect(370, 140, 20, 20);

        fill(0);
        text("'s turn", 395, 155);
      }

      else{
        if(game.players[0].points > game.players[1].points){
          fill(game.players[0].fill);
          rect(370, 140, 20, 20);
          fill(0);
          text("won!", 395, 155);
        }

        else if(game.players[1].points > game.players[0].points){
          fill(game.players[1].fill);
          rect(370, 140, 20, 20);
          fill(0);
          text("won!", 395, 155);
        }

        else{
          text("It's a tie!", 370, 155);
        }
      }

      pop();
    }
  };
}

function Board(){
  return {
    draw(game, dt){
      var tileColor;
      push();
      noStroke();
      for(var j=0; j<9; j++){
        for(var i=0; i<9; i++){
          if((i + j) % 2 === 0){
            tileColor = color(170, 170, 170);
          }
          else{
            tileColor = color(200, 200, 200);
          }
          fill(tileColor);
          rect(i*40, j*40, 40, 40);
        }
      }
      pop();
    }
  };
}

function Player(x, y, name, controls){
  return {
    name: name,
    x: x,
    y: y,
    points: 0,
    speed: 1,
    width: 40,
    height: 40,
    fill: name,
    left: controls.left,
    right: controls.right,
    up: controls.up,
    down: controls.down,
    tag: controls.tag,
    draw(game, dt){
      push();
      noStroke();
      fill(this.fill);
      rect(this.x * 40, this.y * 40, this.width, this.height);
      pop();
    }
  };
}

function Food(x, y){
  return {
    x: x,
    y: y,
    width: 20,
    height: 20,
    fill: null,
    age: 0,
    owner: null,
    alpha: 0,
    draw(game, dt){
      if(this.fill === null){
        return;
      }

      push();
      strokeWeight(1);
      noStroke();
      var red = color(this.fill)._array[0] *255;
      var green = color(this.fill)._array[1] * 255;
      var blue = color(this.fill)._array[2] * 255;
      var alpha;

      fill(red, green, blue);

      ellipse(this.x * 40 + 20, this.y * 40 + 20, this.width, this.height);

      var radians = 2 * Math.PI * 0.5 * this.age;

      noFill();
      alpha =   (100.0 * Math.sin(radians - Math.PI / 2) + 100.0);

      stroke(color(red, green, blue, alpha));
      ellipse(this.x * 40 + 20, this.y * 40 + 20, this.width + 10 * (this.age % 2), this.height + 10 * (this.age % 2));
      pop();
    }
  }
}

function setup(){
  var red = [];
  var blue = [];

  createCanvas(550, 360);

  game = {
    socket: io.connect("http://" + document.domain+ ":" + location.port),
    background: color(230, 230, 230),
    board: Board(),
    hud: HUD(),
    turns: 50,
    input: {
      w: false,
      a: false,
      s: false,
      d: false
    },

    players: {
      0: Player(4, 0, "red", Controls('a', 'd', 'w', 's', 'f')),
      1: Player(4, 8, "blue", Controls(LEFT_ARROW, RIGHT_ARROW, UP_ARROW, DOWN_ARROW, 'm')),
    },
    currentPlayer: -1,
    food: [],

    mspf: 33,
    lastTick: Date.now()
  };

  game.socket.on('message', function(data){
    console.log(data);
      for(var index in data.players){
        game.players[index].x = data.players[index].x;
        game.players[index].y = data.players[index].y;
        game.players[index].points = data.players[index].points;
      }

      game.turns = data.turns;

      if(data.mode === 'setup') {
        game.food = [];
          for (var food of data.food) {
              game.food.push(Food(food.x, food.y));
          }
      }

      else{
        for(var i=0; i<data.food.length; i++){
          game.food[i].fill = data.food[i].fill;
        }
      }

      game.currentPlayer = data.currentPlayer;
  });

  game.input[LEFT_ARROW] = false;
  game.input[RIGHT_ARROW] = false;
  game.input[DOWN_ARROW] = false;
  game.input[UP_ARROW] = false;

  game.withinRadius = function(object){
    var dx = 0;
    var dy = 0;
    var distance = 0;
    var food = [];

    for(var i=0; i<game.food.length; i++){
      dx = game.food[i].x - object.x;
      dy = game.food[i].y - object.y;

      distance = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
      if(distance < 1.42){
        food.push(game.food[i]);
      }
    }

    return food;
  };

  game.draw = function(dt){
    if(dt >= 0.016){
      background(this.background);
      this.board.draw(game, dt);
      this.hud.draw(game, dt);
      this.lastTick += (dt * 1000);
      for(var i=0; i<this.food.length; i++){
        this.food[i].draw(game, dt);
      }

      for(var id in this.players){
        this.players[id].draw(game, dt);
      }
    }
  };

  game.update = function(dt){
    var dx = 0;
    var dy = 0;
    var food = [];
    var player = this.players[this.currentPlayer];
    var ownerId;
    var inBounds = true;
    var moved = false;

    if(player === undefined){
      return;
    }

    if(this.input[player.left]){
      game.socket.send("left");
      dx -= player.speed;
    }

    else if(this.input[player.right]){
            game.socket.send("right");

      dx += player.speed;
    }

    if(this.input[player.down]){
      game.socket.send("down");

      dy += player.speed;
    }

    else if(this.input[player.up]){
      game.socket.send("up");
      dy -= player.speed;
    }

    moved = moved || (dx !== 0);
    moved = moved || (dy !== 0);
    inBounds = inBounds && (player.x + dx) <= 8;
    inBounds = inBounds && (player.x + dx) >= 0;
    inBounds = inBounds && (player.y + dy) >= 0;
    inBounds = inBounds && (player.y + dy) <= 8;

    if(moved && inBounds){
      player.x += dx;
      player.y += dy;
      this.currentPlayer = ((this.currentPlayer + 1) % 2);
      this.turns -= 1;
    }

    else if(this.input[player.tag]){
      game.socket.send("tag");
      food = this.withinRadius(player);

      for(var i=0; i<food.length; i++){
        if(food[i].owner !== this.currentPlayer){
          food[i].fill = player.fill;
          player.points += 1;

          if(food[i].owner in this.players){
            this.players[food[i].owner].points -= 1;
          }

          food[i].owner = this.currentPlayer;
        }
      }
      this.currentPlayer = ((this.currentPlayer + 1) % 2);
      this.turns -= 1;
    }

    for(var i=0; i<this.food.length; i++){
      this.food[i].age += dt;
    }
  };
}

function clearInput(input){
  game.input.d = false;
  game.input.s = false;
  game.input.a = false;
  game.input.w = false;
  game.input.f = false;
  game.input.m = false;

  game.input[LEFT_ARROW] = false;
  game.input[RIGHT_ARROW] = false;
  game.input[UP_ARROW] = false;
  game.input[DOWN_ARROW] = false;
}

function keyReleased(){
  game.input.d = 'D' === key;
  game.input.s = 'S' === key;
  game.input.a = 'A' === key;
  game.input.w = 'W' === key;
  game.input.f = 'F' === key;
  game.input.m = 'M' === key;

  game.input[LEFT_ARROW] = keyCode === LEFT_ARROW;
  game.input[RIGHT_ARROW] = keyCode === RIGHT_ARROW;
  game.input[UP_ARROW] = keyCode === UP_ARROW;
  game.input[DOWN_ARROW] = keyCode === DOWN_ARROW;
}

function draw(){
  dt = (Date.now() - game.lastTick) / 1000.0;
  if(game.currentPlayer >= 0) {
      game.update(dt);
      game.draw(dt);
  }
  clearInput();
}
