| | |
|---|---|
| **Last Updated** | 2025-12-19 |
| **Author** | Claude Code (Opus 4.5) |
| **Version** | 1.1.0 |

# Browser Games Collection

A collection of browser-based games created entirely by Claude Code using vanilla JavaScript and HTML5 Canvas. Each game was generated from a single natural language prompt.

## Table of Contents

- [Games](#games)
  - [Border Runner](#border-runner)
  - [Asteroids](#asteroids)
  - [Pong Evolution](#pong-evolution)
- [Running the Games](#running-the-games)
- [Prompts Used](#prompts-used)
- [Technical Details](#technical-details)
- [Statistics](#statistics)
- [License](#license)

---

## Games

### Border Runner

A 2D top-down open-world survival game where you play as a smuggler transporting contraband across a border wall.

**Features:**
- WASD keyboard controls with sprint
- Persistent world state via localStorage
- Stealth mechanics (hiding in bushes)
- Patrol AI with detection and chase behavior
- Health, stamina, and wanted level systems
- Minimap navigation
- "The Wall" as a central obstacle with limited gaps

**Controls:** `W/A/S/D` move, `SHIFT` sprint, `E` pickup, `SPACE` drop

**Directory:** [`border-runner/`](border-runner/)

---

### Asteroids

A classic Asteroids arcade game clone with vector-style graphics and physics-based movement.

**Features:**
- Ship rotation and thrust with inertia
- Asteroids split into smaller pieces when destroyed
- Hyperspace emergency teleportation
- Progressive difficulty (more asteroids per level)
- Extra life every 10,000 points
- High score persistence
- Particle effects for explosions and thrust
- Configurable ship handling (rotation speed, thrust)
- Debug logging system

**Controls:** `W` thrust, `A/D` rotate, `SPACE` fire, `S` hyperspace, `P` pause

**Directory:** [`asteroids/`](asteroids/)

---

### Pong Evolution

An AI-vs-AI Pong game featuring genetic algorithms that evolve over successive tournament generations.

**Features:**
- Computer vs computer gameplay (no human players)
- 12-gene genome controlling paddle AI behavior:
  - Tracking and prediction weights
  - Reaction delay and movement smoothing
  - Defensive/offensive strategies
  - Error rates and jitter
- Tournament bracket system with configurable rounds
- Evolution after each tournament:
  - Top 50% survive
  - Elitism (best player preserved)
  - Crossover and mutation breeding
- Real-time visualization of matches
- Genome viewer to inspect AI parameters
- All-time leaderboard tracking
- Event logging

**Web UI Controls:**
- Population size (4-32 players)
- Points to win per game (1-21)
- Matches per pairing (best of 1-9)
- Game speed multiplier (1-10x)
- Mutation rate (1-50%)

**Directory:** [`pong-evolution/`](pong-evolution/)

---

## Running the Games

Each game is self-contained and requires only a static file server. No build process or dependencies needed.

### Using Python (simplest)

```bash
# Border Runner
cd border-runner && python3 -m http.server 8000 --bind 0.0.0.0

# Asteroids
cd asteroids && python3 -m http.server 8001 --bind 0.0.0.0

# Pong Evolution
cd pong-evolution && python3 -m http.server 8002 --bind 0.0.0.0
```

Then open `http://localhost:PORT` in your browser.

### Using Node.js

```bash
npx serve border-runner -p 8000
```

### Using any static file server

Simply serve the directory containing `index.html` for each game.

---

## Prompts Used

The following prompts were used to generate each game. Each game was created from a single prompt (with minor follow-up refinements).

### Border Runner Prompt

```
ultrathink javascript game that runs in a browser. 2d, top down, open world,
persistent world, survival, obstacles interfere with normal play with penalties,
you are playing a drug smuggler, there is a donald trump wall. keyboard control
with W,A,S,D. create all files required in the game/ directory.
```

**Follow-up refinements:**
- "drop isn't working" → Fixed interaction distance and added feedback messages

---

### Asteroids Prompt

```
Please create an Asteroids clone also playable in a web browser, and with a
server that binds to all IP addresses, and runs on a port that isn't used.
```

**Follow-up refinements:**
- "firing doesn't work, it freezes the game, make sure you have sufficient logging to troubleshoot" → Added `getCollisionRadius()` method to Bullet class (was missing, causing crash)
- "the spin rate is way too fast, make it adjustable, also adjustable thrust" → Made `SHIP_ROTATION_SPEED` and `SHIP_THRUST` configurable with documented ranges

---

### Pong Evolution Prompt

```
pong like game, computer vs. computer, each of the paddles uses a different
algorythm, a tournament style ladder system, to find out who the best is,
make them genetic algorythms, and after each successive tournament, you breed
them so they evolve, and then re-run the tournament. Make the tournament rounds
configurable in the webui. Also listen on all IP addresses, on a free TCP port.
```

---

## Technical Details

### Stack

All games use:
- **Language:** Vanilla JavaScript (ES6+)
- **Rendering:** HTML5 Canvas 2D Context
- **Storage:** localStorage for persistence (where applicable)
- **Dependencies:** None

### Architecture

Each game follows a similar structure:
```
game-name/
├── README.md               # Game-specific documentation
├── GAME_SPECIFICATION.md   # LLM-optimized recreation guide
├── index.html              # HTML structure and UI
├── style.css               # Styling
└── game.js                 # All game logic
```

### Game Specifications

All games include `GAME_SPECIFICATION.md` files - comprehensive technical documents optimized for LLMs to recreate the games. These include:
- Complete configuration constants
- Game state structures
- Entity class specifications
- Algorithm descriptions (AI, physics, genetics)
- Implementation guides
- Common pitfalls

---

## Statistics

### Lines of Code by Game

| Game | HTML | CSS | JS | Spec | README | Total |
|------|------|-----|-----|------|--------|-------|
| Border Runner | 62 | 212 | 996 | ~500 | ~100 | ~1,870 |
| Asteroids | 44 | 147 | 688 | ~600 | ~100 | ~1,579 |
| Pong Evolution | 119 | 431 | 1,127 | ~500 | ~120 | ~2,297 |
| **Total** | **225** | **790** | **2,811** | **~1,600** | **~320** | **~5,746** |

### Complexity Metrics

| Game | Classes | Functions | Config Options |
|------|---------|-----------|----------------|
| Border Runner | 6 | ~30 | 17 |
| Asteroids | 4 | ~25 | 21 |
| Pong Evolution | 5 | ~40 | 12 genes + 5 UI |

---

## License

👽 Directed by Chrispy <alienresidents@gmail.com>

MIT License - These games were generated by Claude Code and are provided as-is for educational and entertainment purposes.

---

*Generated with Claude Code (Opus 4.5) - December 2025*
