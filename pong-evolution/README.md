| | |
|---|---|
| **Last Updated** | 2025-12-19 |
| **Author** | Claude Code |
| **Version** | 1.0.0 |

# Pong Evolution

An AI-vs-AI Pong game featuring genetic algorithms that evolve paddle controllers through tournament-based natural selection.

## Table of Contents

- [Screenshots](#screenshots)
- [How It Works](#how-it-works)
- [Features](#features)
- [Running the Game](#running-the-game)
- [Configuration](#configuration)
- [The Genome](#the-genome)
- [Evolution Process](#evolution-process)
- [Files](#files)

---

## Screenshots

*Open `index.html` in a browser to watch AI evolution*

---

## How It Works

1. **Initialize**: Create a population of AI players with random genomes
2. **Tournament**: Run elimination bracket - AIs play Pong against each other
3. **Evaluate**: Calculate fitness based on wins and point differential
4. **Select**: Top 50% of players survive
5. **Breed**: Create new players by combining parent genomes
6. **Mutate**: Randomly adjust some genes
7. **Repeat**: Run another tournament with the evolved population

Watch as increasingly skilled Pong AIs emerge through natural selection!

---

## Features

- **No Human Players**: Fully autonomous AI vs AI matches
- **Genetic Algorithms**: 12-gene genome controlling paddle behavior
- **Tournament System**: Bracket-style elimination with best-of-N series
- **Real-time Visualization**: Watch matches as they happen
- **Configurable Speed**: Run at 1-10x speed
- **Genome Viewer**: Inspect any player's genetic makeup
- **Leaderboard**: Track all-time best performers
- **Event Log**: Follow match results and evolution events

---

## Running the Game

```bash
# Using Python
python3 -m http.server 8002

# Using Node.js
npx serve . -p 8002
```

Then open http://localhost:8002 in your browser.

### Quick Start

1. Open the game in your browser
2. Adjust settings if desired (or use defaults)
3. Click **Start Tournament**
4. Watch the AIs compete and evolve!

---

## Configuration

### Web UI Controls

| Setting | Default | Range | Description |
|---------|---------|-------|-------------|
| Population Size | 8 | 4-32 | Number of AI players |
| Points to Win | 5 | 1-21 | Points to win a single game |
| Matches per Pairing | 3 | 1-9 | Best-of-N series |
| Game Speed | 1x | 1-10x | Simulation speed |
| Mutation Rate | 10% | 1-50% | Gene mutation probability |

---

## The Genome

Each AI player has 12 genes controlling their behavior:

### Tracking Behavior
| Gene | Range | Description |
|------|-------|-------------|
| `trackingWeight` | 0-1 | Weight for direct ball tracking |
| `predictionWeight` | 0-1 | Weight for trajectory prediction |
| `predictionFrames` | 5-60 | How far ahead to predict |

### Positioning
| Gene | Range | Description |
|------|-------|-------------|
| `centerBias` | 0-1 | Tendency to return to center |
| `aggressiveness` | 0-1 | How far from center to position |
| `sweetSpotOffset` | -0.5 to 0.5 | Preferred hit point on paddle |

### Reaction
| Gene | Range | Description |
|------|-------|-------------|
| `reactionDelay` | 0-10 | Frames before responding |
| `movementSmoothing` | 0-0.9 | Movement interpolation factor |

### Strategy
| Gene | Range | Description |
|------|-------|-------------|
| `defensiveThreshold` | 0.3-0.7 | When to switch to defense |
| `offensiveAngling` | 0-1 | Attempt to angle returns |

### Imperfection
| Gene | Range | Description |
|------|-------|-------------|
| `errorRate` | 0-0.3 | Random positioning error |
| `jitterAmount` | 0-5 | Random movement noise |

---

## Evolution Process

### Selection
- **Elitism**: Best player is cloned unchanged
- **Tournament Selection**: Random 3-way competitions to pick parents
- **Survival**: Top 50% of population breeds

### Breeding
- **Crossover**: Randomly select genes from each parent
- **Blending**: 30% chance to average gene values instead
- **Mutation**: Randomly adjust genes based on mutation rate

### Fitness Function
```
fitness = (winRate * 1000) + (avgPointDifferential * 10)
```

---

## Things to Watch For

As generations progress, observe:

1. **Strategy Emergence**: Do AIs develop prediction vs reaction strategies?
2. **Convergence**: Do all genomes become similar over time?
3. **Error Tolerance**: Do some error rates provide beneficial randomness?
4. **Optimal Values**: What gene values consistently succeed?
5. **Generation Jumps**: When do significant improvements occur?

---

## Files

| File | Lines | Description |
|------|-------|-------------|
| `index.html` | 119 | HTML structure with control panels |
| `style.css` | 431 | Dark theme tournament UI |
| `game.js` | 1,127 | GA system, Pong engine, tournament logic |
| `GAME_SPECIFICATION.md` | ~500 | LLM-optimized recreation guide |

**Total**: ~2,177 lines of code

---

## License

👽 Directed by Chrispy <alienresidents@gmail.com>

MIT License
