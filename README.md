| | |
|---|---|
| **Last Updated** | 2025-12-19 |
| **Author** | Claude Code (Opus 4.5) |
| **Version** | 1.2.0 |

# Browser Games Collection

A collection of browser-based games created entirely by Claude Code. Each game was generated from a single natural language prompt.

## Table of Contents

- [Games](#games)
  - [Border Runner](#border-runner)
  - [Asteroids](#asteroids)
  - [Pong Evolution (Vanilla JS)](#pong-evolution-vanilla-js)
  - [Pong Evolution (Python/Flask)](#pong-evolution-pythonflask)
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

### Pong Evolution (Vanilla JS)

An AI-vs-AI Pong game featuring genetic algorithms that evolve over successive tournament generations. Pure client-side implementation.

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

### Pong Evolution (Python/Flask)

An alternative server-side implementation using Python, Flask, and WebSockets. Features 32 AI players competing in single-elimination tournaments.

**Features:**
- 32 AI players with unique genetic traits
- Single elimination tournaments (5 rounds to champion)
- 6-gene chromosome per AI:
  - `reaction_time` - Response speed to ball movement
  - `prediction_depth` - How far ahead to predict ball position
  - `aggression` - Tendency to chase predicted position
  - `noise_tolerance` - Random movement factor
  - `speed_scaling` - Maximum paddle movement speed
  - `anticipation` - Weight given to ball velocity vs position
- Server-side game simulation at 60 FPS
- WebSocket real-time updates
- Tournament bracket and standings display

**Architecture:**
```
┌─────────────────────────────────────────────────────────────┐
│                      Web Browser                             │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐   │
│  │ Game Canvas │  │   Bracket    │  │    Standings      │   │
│  │  (800x600)  │  │   Display    │  │   Leaderboard     │   │
│  └─────────────┘  └──────────────┘  └───────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          │ WebSocket
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Flask Server (app.py)                     │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐   │
│  │    Game     │  │  Tournament  │  │     Genetic       │   │
│  │   Engine    │  │   Manager    │  │    Algorithm      │   │
│  │  (game.py)  │  │(tournament.py│  │   (genetic.py)    │   │
│  └─────────────┘  └──────────────┘  └───────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Genetic Algorithm:**
- Tournament selection (3 random individuals compete)
- Single-point crossover with 10% per-gene uniform crossover
- Gaussian mutation (σ=0.2) with 10% probability per gene
- Elitism: Top 50% survive unchanged

**Fitness Function:**
```
fitness = (wins × 100) + (point_differential × 10) + (points_scored × 1)
```

**Directory:** [`llm/pong-evolution/`](llm/pong-evolution/)

---

## Running the Games

### Vanilla JS Games (Static Server)

Each vanilla JS game requires only a static file server. No build process or dependencies needed.

```bash
# Border Runner
cd border-runner && python3 -m http.server 8000 --bind 0.0.0.0

# Asteroids
cd asteroids && python3 -m http.server 8001 --bind 0.0.0.0

# Pong Evolution (JS)
cd pong-evolution && python3 -m http.server 8002 --bind 0.0.0.0
```

Or with Node.js: `npx serve <directory> -p <port>`

### Kubernetes Deployment

The vanilla JS games can be deployed to Kubernetes using the included manifests. Each game is containerized with nginx:alpine and served via Traefik ingress with automatic TLS certificates.

```bash
# Quick deploy (after configuring your registry and domain)
kubectl apply -f k8s/namespace.yaml
kubectl apply -f asteroids/k8s/
kubectl apply -f border-runner/k8s/
kubectl apply -f pong-evolution/k8s/
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for complete instructions including:
- GCP Artifact Registry setup
- Building and pushing container images
- Kubernetes manifest configuration
- Troubleshooting guide

---

### Python/Flask Pong Evolution

```bash
cd llm/pong-evolution

# Create virtual environment and install dependencies
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Start server (auto-finds free port, binds to 0.0.0.0)
python app.py
```

---

## Prompts Used

The following prompts were used to generate each game.

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

Used for both implementations:

```
pong like game, computer vs. computer, each of the paddles uses a different
algorythm, a tournament style ladder system, to find out who the best is,
make them genetic algorythms, and after each successive tournament, you breed
them so they evolve, and then re-run the tournament. Make the tournament rounds
configurable in the webui. Also listen on all IP addresses, on a free TCP port.
```

**Planning clarifications (Python version):**
- Population: 32 players
- Tournament format: Single elimination

---

## Technical Details

### Stack Comparison

| Component | Vanilla JS Games | Python Pong |
|-----------|------------------|-------------|
| Language | JavaScript (ES6+) | Python 3.10+ |
| Rendering | HTML5 Canvas | HTML5 Canvas |
| Server | Static file server | Flask + WebSockets |
| Communication | N/A | Socket.IO |
| Storage | localStorage | In-memory |
| Dependencies | None | flask, flask-socketio, eventlet |

### File Structures

**Vanilla JS Games:**
```
game-name/
├── README.md               # Game-specific documentation
├── GAME_SPECIFICATION.md   # LLM-optimized recreation guide
├── index.html              # HTML structure and UI
├── style.css               # Styling
└── game.js                 # All game logic
```

**Python Pong Evolution:**
```
llm/pong-evolution/
├── app.py                  # Flask server, WebSocket handlers
├── game.py                 # Pong physics engine, AI controller
├── genetic.py              # Chromosome, crossover, mutation
├── tournament.py           # Bracket generation, match scheduling
├── requirements.txt        # Python dependencies
├── templates/
│   └── index.html          # Web UI structure
└── static/
    ├── game.js             # Canvas rendering, WebSocket client
    └── style.css           # Dark theme styling
```

### Game Specifications

All vanilla JS games include `GAME_SPECIFICATION.md` files - comprehensive technical documents optimized for LLMs to recreate the games:
- Complete configuration constants
- Game state structures
- Entity class specifications
- Algorithm descriptions (AI, physics, genetics)
- Implementation guides
- Common pitfalls

---

## Statistics

### Lines of Code by Game

| Game | HTML | CSS | JS | Python | Spec | README | Total |
|------|------|-----|-----|--------|------|--------|-------|
| Border Runner | 62 | 212 | 996 | - | ~500 | ~100 | ~1,870 |
| Asteroids | 44 | 147 | 688 | - | ~600 | ~100 | ~1,579 |
| Pong Evolution (JS) | 119 | 431 | 1,127 | - | ~500 | ~120 | ~2,297 |
| Pong Evolution (Py) | 83 | 358 | 272 | 989 | - | - | ~1,702 |
| **Total** | **308** | **1,148** | **3,083** | **989** | **~1,600** | **~320** | **~7,448** |

### Complexity Metrics

| Game | Classes/Modules | Functions | Config Options |
|------|-----------------|-----------|----------------|
| Border Runner | 6 classes | ~30 | 17 |
| Asteroids | 4 classes | ~25 | 21 |
| Pong Evolution (JS) | 5 classes | ~40 | 12 genes + 5 UI |
| Pong Evolution (Py) | 4 modules | ~50 | 6 genes + 4 UI |

---

## License

👽 Directed by Chrispy <alienresidents@gmail.com>

MIT License - These games were generated by Claude Code and are provided as-is for educational and entertainment purposes.

---

*Generated with Claude Code (Opus 4.5) - December 2025*
