#!/usr/bin/env python3
"""Flask server for Pong Evolution tournament."""

import socket
import threading
import time
from flask import Flask, render_template, jsonify
from flask_socketio import SocketIO, emit

from game import PongGame
from tournament import TournamentManager

app = Flask(__name__)
app.config['SECRET_KEY'] = 'pong-evolution-secret'
socketio = SocketIO(app, cors_allowed_origins="*")

# Global state
manager = TournamentManager(population_size=32)
current_game = None
game_speed = 1  # 1x, 2x, 5x, 10x
running = False
game_thread = None


def find_free_port():
    """Find a free TCP port."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('', 0))
        s.listen(1)
        port = s.getsockname()[1]
    return port


@app.route('/')
def index():
    """Serve main page."""
    return render_template('index.html')


@app.route('/api/state')
def get_state():
    """Get current tournament state."""
    return jsonify(manager.get_state())


@socketio.on('connect')
def handle_connect():
    """Handle client connection."""
    emit('state_update', manager.get_state())


@socketio.on('initialize')
def handle_initialize(data):
    """Initialize tournament with new population."""
    global manager
    population_size = data.get('population_size', 32)
    manager = TournamentManager(population_size=population_size)
    manager.initialize()
    emit('state_update', manager.get_state(), broadcast=True)
    emit('message', {'text': f'Initialized {population_size} AI players'}, broadcast=True)


@socketio.on('start_tournament')
def handle_start_tournament(data):
    """Start tournament(s)."""
    global running, game_thread

    num_tournaments = data.get('num_tournaments', 1)

    if not manager.population:
        manager.initialize()

    manager.start_tournament(num_tournaments)
    running = True

    emit('state_update', manager.get_state(), broadcast=True)
    emit('message', {'text': f'Starting {num_tournaments} tournament(s)...'}, broadcast=True)

    # Start game loop in background thread
    if game_thread is None or not game_thread.is_alive():
        game_thread = threading.Thread(target=game_loop, daemon=True)
        game_thread.start()


@socketio.on('stop')
def handle_stop():
    """Stop tournament."""
    global running
    running = False
    emit('message', {'text': 'Tournament paused'}, broadcast=True)


@socketio.on('resume')
def handle_resume():
    """Resume tournament."""
    global running, game_thread
    running = True
    emit('message', {'text': 'Tournament resumed'}, broadcast=True)

    if game_thread is None or not game_thread.is_alive():
        game_thread = threading.Thread(target=game_loop, daemon=True)
        game_thread.start()


@socketio.on('set_speed')
def handle_set_speed(data):
    """Set game speed multiplier."""
    global game_speed
    game_speed = data.get('speed', 1)
    emit('message', {'text': f'Speed set to {game_speed}x'}, broadcast=True)


def game_loop():
    """Main game loop running in background thread."""
    global current_game, running

    frame_delay = 1 / 60  # 60 FPS base

    while running:
        match = manager.get_next_match()

        if match is None:
            # Check if tournament is complete
            if manager.check_tournament_complete():
                running = False
                socketio.emit('tournament_complete', manager.get_state())
                socketio.emit('message', {'text': 'All tournaments complete!'})
                break
            continue

        # Start new game
        current_game = PongGame(match.player1, match.player2)

        socketio.emit('match_start', {
            'player1': match.player1.to_dict(),
            'player2': match.player2.to_dict(),
            'match_id': match.match_id,
            'round': match.round_num
        })

        # Run game to completion
        frame_count = 0
        while not current_game.state.game_over and running:
            state = current_game.update()

            # Emit game state at appropriate intervals based on speed
            if frame_count % max(1, game_speed) == 0:
                socketio.emit('game_update', state)

            frame_count += 1

            # Throttle based on speed setting
            actual_delay = frame_delay / game_speed
            if game_speed <= 2:
                time.sleep(actual_delay)
            elif frame_count % 10 == 0:
                # For high speeds, only sleep occasionally to prevent CPU hogging
                time.sleep(0.001)

        if not running:
            break

        # Record match result
        winner = match.player1 if current_game.state.winner == "left" else match.player2
        manager.record_match(
            match,
            winner,
            current_game.state.left_score,
            current_game.state.right_score
        )

        socketio.emit('match_complete', {
            'winner': winner.to_dict(),
            'player1_score': current_game.state.left_score,
            'player2_score': current_game.state.right_score
        })

        socketio.emit('state_update', manager.get_state())

        # Brief pause between matches
        time.sleep(0.5 / game_speed)


def main():
    """Main entry point."""
    port = find_free_port()
    print(f"\n{'='*50}")
    print(f"  Pong Evolution Tournament Server")
    print(f"  Running on http://0.0.0.0:{port}")
    print(f"{'='*50}\n")

    socketio.run(app, host='0.0.0.0', port=port, debug=False, allow_unsafe_werkzeug=True)


if __name__ == '__main__':
    main()
