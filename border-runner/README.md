| | |
|---|---|
| **Last Updated** | 2025-12-19 |
| **Author** | Claude Code |
| **Version** | 1.0.0 |

# Border Runner

A 2D top-down open-world survival game where you play as a smuggler transporting contraband across a border wall.

## Table of Contents

- [Screenshots](#screenshots)
- [Controls](#controls)
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
| W | Move up |
| A | Move left |
| S | Move down |
| D | Move right |
| SHIFT | Sprint (drains stamina) |
| E | Pick up package |
| SPACE | Drop cargo at drop zone |

---

## Gameplay

1. **Start** south of "The Wall" in the desert
2. **Collect** green packages scattered around (worth $100-$600 each)
3. **Navigate** through wall gaps to reach the north side
4. **Deliver** cargo to orange drop zones to earn cash
5. **Avoid** border patrols - they'll chase you and confiscate cargo
6. **Hide** in bushes to evade detection
7. **Survive** - don't let health or wanted level max out

### Win Condition
Accumulate as much cash as possible without getting caught.

### Lose Conditions
- Health reaches 0
- Wanted level reaches 100%

---

## Features

- **Open World**: 4000x3000 pixel map with camera follow
- **The Wall**: Central barrier with limited gaps to cross
- **Stealth**: Hide in bushes to become invisible to patrols
- **Patrol AI**: Border agents patrol, detect, and chase players
- **Stats System**: Health, stamina, wanted level
- **Cargo System**: Carry up to 5 packages at once
- **Persistence**: Auto-saves to localStorage every 30 seconds
- **Minimap**: Shows packages, patrols, drop zones, and wall gaps

---

## Running the Game

```bash
# Using Python
python3 -m http.server 8000

# Using Node.js
npx serve . -p 8000
```

Then open http://localhost:8000 in your browser.

---

## Configuration

Edit `game.js` to adjust game parameters:

```javascript
const GAME_CONFIG = {
    CANVAS_WIDTH: 1200,
    CANVAS_HEIGHT: 800,
    WORLD_WIDTH: 4000,
    WORLD_HEIGHT: 3000,
    PLAYER_SPEED: 4,
    SPRINT_MULTIPLIER: 1.8,
    MAX_CARGO: 5,
    WALL_Y: 1500,
    WALL_THICKNESS: 80
};
```

---

## Files

| File | Lines | Description |
|------|-------|-------------|
| `index.html` | 62 | HTML structure and UI elements |
| `style.css` | 212 | Dark theme styling |
| `game.js` | 996 | Complete game logic |
| `GAME_SPECIFICATION.md` | ~500 | LLM-optimized recreation guide |

**Total**: ~1,770 lines of code

---

## License

👽 Directed by Chrispy <alienresidents@gmail.com>

MIT License
