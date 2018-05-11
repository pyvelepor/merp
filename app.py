import itertools as it
import random
import math

from flask import Flask, request, render_template
from flask_socketio import SocketIO

app = Flask(__name__, static_folder='static', static_url_path="")
socketio = SocketIO(app)
players = {}
board = []
currentPlayer = 0
food = []
turns = 50

def new_player(number):
    y = 0

    color = None

    if number == 0:
        color = "red"

    elif number == 1:
        y = 8
        color = "blue"

    return {
        'x': 4,
        'y': y,
        'number': number,
        'fill': color,
        'points': 0
    }

@app.route('/')
def hello_world():
    return render_template('index.html')

@socketio.on('connect')
def on_connect():
    global food
    if request.sid not in players:
        players[request.sid] = new_player(len(players))

    if len(players) == 2:
        upper_coordinates = list(it.product(range(9), range(4)))
        lower_coordinates = list(it.product(range(9), range(5, 9)))
        upper_coordinates = random.sample(upper_coordinates, 10)
        lower_coordinates = random.sample(lower_coordinates, 10)

        food.extend(upper_coordinates)
        food.extend(lower_coordinates)

        food = [{'x':x, 'y':y, 'fill': None, 'owner': None}
                for x, y in food]

        for _, player in players.items():
            player['x'] = 4
            player['y'] = player['number'] * 8

        socketio.send({
            'mode': 'setup',
            'food': food,
            'players': {player['number']: player for _, player in players.items()},
            'currentPlayer': currentPlayer,
            'turns': turns
        })

@socketio.on("message")
def on_message(action):
    player = players[request.sid]
    global currentPlayer, turns

    dx = 0
    dy = 0

    if action == "up":
        dy -= 1

    if action == "right":
        dx += 1

    if action == "down":
        dy += 1

    if action == "left":
        dx -= 1

    moved = dx != 0 or dy != 0
    inbounds = 0 <= player['x'] + dx <= 8
    inbounds = inbounds and 0 <= player['y'] + dx <= 8
    in_radius = []

    if player['number'] == currentPlayer:
        if moved and inbounds:
            player['x'] += dx
            player['y'] += dy

        elif action == 'tag':
            for f in food:
                distance = math.sqrt((f['x'] - player['x']) ** 2 + (f['y'] - player['y']) ** 2)

                if distance < 1.42 and f['owner'] != player['fill']:
                    f['fill'] = player['fill']
                    player['points'] += 1

                    for sid, p in players.items():
                        if sid != request.sid and f['owner'] == p['fill']:
                            p['points'] -= 1

                    f['owner'] = f['fill']

        currentPlayer = (currentPlayer + 1) % 2
        turns -= 1

    socketio.send({
        'food':food,
        'players': {player['number']: player for _, player in players.items()},
        'currentPlayer': currentPlayer,
        'turns': turns
    })

@socketio.on('disconnect')
def on_disconnect():
    print("hi")
    del players[request.sid]


if __name__ == '__main__':
    socketio.run(app)