"""Pong game engine with AI paddle controllers."""

import math
import random
from dataclasses import dataclass, field
from typing import Optional, Tuple

from genetic import Chromosome


@dataclass
class Ball:
    """Ball state and physics."""

    x: float = 400.0
    y: float = 300.0
    vx: float = 5.0
    vy: float = 0.0
    radius: float = 10.0
    speed: float = 5.0

    def reset(self, direction: int = 1):
        """Reset ball to center with random angle."""
        self.x = 400.0
        self.y = 300.0

        # Random angle between -45 and 45 degrees
        angle = random.uniform(-math.pi / 4, math.pi / 4)

        self.vx = self.speed * math.cos(angle) * direction
        self.vy = self.speed * math.sin(angle)

    def to_dict(self) -> dict:
        return {
            "x": self.x,
            "y": self.y,
            "vx": self.vx,
            "vy": self.vy,
            "radius": self.radius
        }


@dataclass
class Paddle:
    """Paddle state and AI controller."""

    x: float
    y: float = 300.0
    width: float = 10.0
    height: float = 80.0
    speed: float = 6.0
    chromosome: Optional[Chromosome] = None
    side: str = "left"  # "left" or "right"

    def move_up(self, amount: float = 1.0):
        self.y = max(self.height / 2, self.y - self.speed * amount)

    def move_down(self, amount: float = 1.0):
        self.y = min(600 - self.height / 2, self.y + self.speed * amount)

    def get_ai_move(self, ball: Ball, game_height: int = 600) -> float:
        """Calculate AI movement based on chromosome genes."""
        if not self.chromosome:
            return 0.0

        genes = self.chromosome

        # Base target: ball's current y position
        target_y = ball.y

        # Prediction: estimate where ball will be when it reaches paddle
        if genes.prediction_depth > 0:
            predicted_y = self._predict_ball_y(ball, game_height)
            target_y = target_y * (1 - genes.prediction_depth) + predicted_y * genes.prediction_depth

        # Anticipation: weight velocity into targeting
        if genes.anticipation > 0:
            velocity_adjustment = ball.vy * 10 * genes.anticipation
            target_y += velocity_adjustment

        # Aggression: blend between target and center
        center_y = game_height / 2
        target_y = target_y * genes.aggression + center_y * (1 - genes.aggression)

        # Add noise
        if genes.noise_tolerance > 0:
            noise = random.gauss(0, 30 * genes.noise_tolerance)
            target_y += noise

        # Calculate movement direction and speed
        diff = target_y - self.y

        # Reaction time affects responsiveness
        reaction_threshold = 50 * (1 - genes.reaction_time)
        if abs(diff) < reaction_threshold:
            return 0.0

        # Speed scaling
        move_amount = min(1.0, abs(diff) / 50) * genes.speed_scaling

        if diff > 0:
            return move_amount
        else:
            return -move_amount

    def _predict_ball_y(self, ball: Ball, game_height: int) -> float:
        """Predict where the ball will be when it reaches this paddle's x."""
        if ball.vx == 0:
            return ball.y

        # Time to reach paddle
        if self.side == "left":
            if ball.vx > 0:
                # Ball moving away, predict bounce back
                time_to_wall = (800 - ball.x) / ball.vx
                time_back = (800 - self.x) / abs(ball.vx)
                total_time = time_to_wall + time_back
            else:
                total_time = (ball.x - self.x) / abs(ball.vx)
        else:  # right side
            if ball.vx < 0:
                # Ball moving away
                time_to_wall = ball.x / abs(ball.vx)
                time_back = self.x / abs(ball.vx)
                total_time = time_to_wall + time_back
            else:
                total_time = (self.x - ball.x) / ball.vx

        # Predict y position
        predicted_y = ball.y + ball.vy * total_time

        # Account for wall bounces
        while predicted_y < 0 or predicted_y > game_height:
            if predicted_y < 0:
                predicted_y = -predicted_y
            if predicted_y > game_height:
                predicted_y = 2 * game_height - predicted_y

        return predicted_y

    def to_dict(self) -> dict:
        return {
            "x": self.x,
            "y": self.y,
            "width": self.width,
            "height": self.height,
            "name": self.chromosome.name if self.chromosome else "Unknown",
            "side": self.side
        }


@dataclass
class GameState:
    """Complete game state."""

    ball: Ball = field(default_factory=Ball)
    left_paddle: Paddle = field(default_factory=lambda: Paddle(x=30.0, side="left"))
    right_paddle: Paddle = field(default_factory=lambda: Paddle(x=770.0, side="right"))
    left_score: int = 0
    right_score: int = 0
    width: int = 800
    height: int = 600
    winning_score: int = 5
    game_over: bool = False
    winner: Optional[str] = None

    def to_dict(self) -> dict:
        return {
            "ball": self.ball.to_dict(),
            "left_paddle": self.left_paddle.to_dict(),
            "right_paddle": self.right_paddle.to_dict(),
            "left_score": self.left_score,
            "right_score": self.right_score,
            "width": self.width,
            "height": self.height,
            "game_over": self.game_over,
            "winner": self.winner
        }


class PongGame:
    """Pong game engine."""

    def __init__(self, left_chromosome: Chromosome, right_chromosome: Chromosome):
        self.state = GameState()
        self.state.left_paddle.chromosome = left_chromosome
        self.state.right_paddle.chromosome = right_chromosome
        self.state.ball.reset(direction=random.choice([-1, 1]))

    def update(self) -> dict:
        """Update game state for one frame. Returns state dict."""
        if self.state.game_over:
            return self.state.to_dict()

        # AI paddle movement
        left_move = self.state.left_paddle.get_ai_move(self.state.ball, self.state.height)
        right_move = self.state.right_paddle.get_ai_move(self.state.ball, self.state.height)

        if left_move > 0:
            self.state.left_paddle.move_down(abs(left_move))
        elif left_move < 0:
            self.state.left_paddle.move_up(abs(left_move))

        if right_move > 0:
            self.state.right_paddle.move_down(abs(right_move))
        elif right_move < 0:
            self.state.right_paddle.move_up(abs(right_move))

        # Ball movement
        self.state.ball.x += self.state.ball.vx
        self.state.ball.y += self.state.ball.vy

        # Wall collision (top/bottom)
        if self.state.ball.y - self.state.ball.radius <= 0:
            self.state.ball.y = self.state.ball.radius
            self.state.ball.vy = abs(self.state.ball.vy)
        elif self.state.ball.y + self.state.ball.radius >= self.state.height:
            self.state.ball.y = self.state.height - self.state.ball.radius
            self.state.ball.vy = -abs(self.state.ball.vy)

        # Paddle collision
        self._check_paddle_collision(self.state.left_paddle)
        self._check_paddle_collision(self.state.right_paddle)

        # Scoring
        if self.state.ball.x < 0:
            self._score("right")
        elif self.state.ball.x > self.state.width:
            self._score("left")

        return self.state.to_dict()

    def _check_paddle_collision(self, paddle: Paddle):
        """Check and handle ball-paddle collision."""
        ball = self.state.ball

        # Check if ball is in paddle's x range
        paddle_left = paddle.x - paddle.width / 2
        paddle_right = paddle.x + paddle.width / 2
        paddle_top = paddle.y - paddle.height / 2
        paddle_bottom = paddle.y + paddle.height / 2

        if (paddle_left <= ball.x <= paddle_right and
                paddle_top <= ball.y <= paddle_bottom):

            # Determine reflection angle based on where ball hit paddle
            relative_hit = (ball.y - paddle.y) / (paddle.height / 2)
            relative_hit = max(-1, min(1, relative_hit))  # Clamp to [-1, 1]

            # Calculate new angle (max 60 degrees)
            max_angle = math.pi / 3
            angle = relative_hit * max_angle

            # Maintain or slightly increase speed
            speed = math.sqrt(ball.vx ** 2 + ball.vy ** 2)
            speed = min(speed * 1.02, 15.0)  # Slight speed increase, capped

            # Set new velocity
            if paddle.side == "left":
                ball.vx = abs(speed * math.cos(angle))
                ball.x = paddle_right + ball.radius
            else:
                ball.vx = -abs(speed * math.cos(angle))
                ball.x = paddle_left - ball.radius

            ball.vy = speed * math.sin(angle)

    def _score(self, side: str):
        """Handle scoring."""
        if side == "left":
            self.state.left_score += 1
            self.state.left_paddle.chromosome.points_scored += 1
            self.state.right_paddle.chromosome.points_conceded += 1
            self.state.ball.reset(direction=1)
        else:
            self.state.right_score += 1
            self.state.right_paddle.chromosome.points_scored += 1
            self.state.left_paddle.chromosome.points_conceded += 1
            self.state.ball.reset(direction=-1)

        # Check for winner
        if self.state.left_score >= self.state.winning_score:
            self.state.game_over = True
            self.state.winner = "left"
            self.state.left_paddle.chromosome.wins += 1
            self.state.right_paddle.chromosome.losses += 1
        elif self.state.right_score >= self.state.winning_score:
            self.state.game_over = True
            self.state.winner = "right"
            self.state.right_paddle.chromosome.wins += 1
            self.state.left_paddle.chromosome.losses += 1

    def run_to_completion(self, max_frames: int = 10000) -> Tuple[str, int, int]:
        """Run game until completion. Returns (winner, left_score, right_score)."""
        frame = 0
        while not self.state.game_over and frame < max_frames:
            self.update()
            frame += 1

        return self.state.winner, self.state.left_score, self.state.right_score
