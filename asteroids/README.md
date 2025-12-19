| | |
|---|---|
| **Last Updated** | 2025-12-19 |
| **Author** | Claude Code |
| **Version** | 1.0.0 |

# Asteroids

A classic Asteroids arcade game clone with vector-style graphics and physics-based movement.

## Table of Contents

- [Screenshots](#screenshots)
- [Controls](#controls)
- [Mobile Controls](#mobile-controls)
- [Gameplay](#gameplay)
- [Features](#features)
- [Running the Game](#running-the-game)
- [Configuration](#configuration)
- [Files](#files)

---

## Screenshots

*Open `index.html` in a browser to play*

---

## Controls

| Key | Action |
|-----|--------|
| W / Arrow Up | Thrust forward |
| A / Arrow Left | Rotate counter-clockwise |
| D / Arrow Right | Rotate clockwise |
| S / Arrow Down | Hyperspace (random teleport) |
| SPACE | Fire |
| P | Pause |

---

## Mobile Controls

Touch controls are automatically enabled on mobile devices:

| Button | Action |
|--------|--------|
| ◀ | Rotate left (hold) |
| ▲ | Thrust forward (hold) |
| ▶ | Rotate right (hold) |
| FIRE | Shoot |
| HYPER | Hyperspace teleport |
| ⏸ | Pause game |

Touch controls support multi-touch, so you can thrust and fire simultaneously.

---

## Gameplay

1. **Destroy** asteroids by shooting them
2. **Avoid** collisions with asteroids
3. **Large asteroids** split into 2 medium asteroids
4. **Medium asteroids** split into 2 small asteroids
5. **Small asteroids** are destroyed completely
6. **Clear all asteroids** to advance to the next level
7. **Use hyperspace** as emergency escape (random teleport)

### Scoring

| Asteroid Size | Points |
|---------------|--------|
| Large | 20 |
| Medium | 50 |
| Small | 100 |

**Extra life** every 10,000 points.

---

## Features

- **Vector Graphics**: Classic white-on-black line art style
- **Physics**: Thrust and inertia-based movement with friction
- **Screen Wrap**: All objects wrap around screen edges
- **Asteroid Splitting**: Large → Medium → Small → Destroyed
- **Hyperspace**: Emergency teleport with cooldown
- **Invulnerability**: Brief protection after respawn
- **Progressive Difficulty**: More asteroids each level
- **High Score**: Persisted to localStorage
- **Particle Effects**: Explosions and thrust flames
- **Debug Logging**: Console output for troubleshooting

---

## Running the Game

```bash
# Using Python
python3 -m http.server 8001

# Using Node.js
npx serve . -p 8001
```

Then open http://localhost:8001 in your browser.

---

## Configuration

Edit `game.js` to adjust ship handling and game parameters:

```javascript
const CONFIG = {
    // ===== ADJUSTABLE SHIP CONTROLS =====
    SHIP_THRUST: 0.08,           // Acceleration (range: 0.02-0.2)
    SHIP_FRICTION: 0.99,         // Speed decay (range: 0.95-0.995)
    SHIP_ROTATION_SPEED: 0.04,   // Turn speed in radians (range: 0.02-0.1)
    // ====================================

    BULLET_SPEED: 10,
    BULLET_LIFETIME: 60,
    MAX_BULLETS: 10,
    INITIAL_ASTEROIDS: 4,
    // ...
};
```

### Debug Mode

Debug logging is enabled by default. View logs in browser console (Ctrl+Shift+J):

```javascript
const DEBUG = true;  // Set to false to disable logging
```

Log categories: `INPUT`, `SHOOT`, `COLLISION`, `LOOP`, `ERROR`

---

## Files

| File | Lines | Description |
|------|-------|-------------|
| `index.html` | 44 | HTML structure and UI elements |
| `style.css` | 147 | Retro dark theme styling |
| `game.js` | 688 | Complete game logic with debug system |
| `GAME_SPECIFICATION.md` | ~600 | LLM-optimized recreation guide |

**Total**: ~1,479 lines of code

---

## License

👽 Directed by Chrispy <alienresidents@gmail.com>

MIT License
