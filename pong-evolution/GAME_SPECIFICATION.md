| | |
|---|---|
| **Last Updated** | 2025-12-19 |
| **Author** | Claude Code |
| **Version** | 1.0.0 |

# Pong Evolution - Game Specification

An AI-vs-AI Pong game featuring genetic algorithms that evolve paddle controllers through tournament-based natural selection.

## Table of Contents

- [Overview](#overview)
- [Technical Stack](#technical-stack)
- [File Structure](#file-structure)
- [Configuration](#configuration)
- [Genetic Algorithm System](#genetic-algorithm-system)
- [Player AI Architecture](#player-ai-architecture)
- [Pong Game Engine](#pong-game-engine)
- [Tournament System](#tournament-system)
- [Evolution Manager](#evolution-manager)
- [User Interface](#user-interface)
- [Implementation Guide](#implementation-guide)

---

## Overview

### Concept
- **Genre**: AI simulation / evolutionary computing visualization
- **Core Loop**: Tournament → Evaluate Fitness → Select Survivors → Breed → Mutate → Repeat
- **Goal**: Observe emergence of effective paddle strategies through natural selection

### Key Features
- Computer vs computer Pong matches
- 12-gene genome controlling AI behavior
- Tournament bracket elimination system
- Genetic crossover and mutation breeding
- Real-time match visualization
- Configurable evolution parameters
- Persistent leaderboard tracking

---

## Technical Stack

```
Language: Vanilla JavaScript (ES6+)
Rendering: HTML5 Canvas 2D Context
Storage: None (in-memory only)
Server: Any static file server
Dependencies: None
```

---

## File Structure

```
pong-evolution/
├── index.html      # HTML structure with game canvas and control panels
├── style.css       # Dark theme styling for tournament UI
└── game.js         # Complete game logic (~1100 lines)
```

---

## Configuration

```javascript
const CONFIG = {
    // Canvas
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 500,

    // Paddle dimensions
    PADDLE_WIDTH: 15,
    PADDLE_HEIGHT: 80,
    PADDLE_MARGIN: 30,      // Distance from edge
    PADDLE_SPEED: 8,        // Max movement per frame

    // Ball
    BALL_SIZE: 12,
    BALL_SPEED: 6,          // Initial speed
    MAX_BALL_SPEED: 15      // Speed cap after bounces
};
```

---

## Genetic Algorithm System

### Gene Definitions

Each AI player has a genome with 12 genes controlling behavior:

```javascript
const GENE_DEFINITIONS = {
    // === Tracking Behavior ===
    trackingWeight: {
        min: 0, max: 1,
        description: 'How much to track ball Y position directly'
    },
    predictionWeight: {
        min: 0, max: 1,
        description: 'How much to predict ball trajectory'
    },
    predictionFrames: {
        min: 5, max: 60,
        description: 'Frames ahead to predict ball position'
    },

    // === Positioning ===
    centerBias: {
        min: 0, max: 1,
        description: 'Tendency to return to center when ball away'
    },
    aggressiveness: {
        min: 0, max: 1,
        description: 'How far from center to position defensively'
    },
    sweetSpotOffset: {
        min: -0.5, max: 0.5,
        description: 'Preferred hit point on paddle (-0.5 to 0.5)'
    },

    // === Reaction ===
    reactionDelay: {
        min: 0, max: 10,
        description: 'Frames before responding to ball movement'
    },
    movementSmoothing: {
        min: 0, max: 0.9,
        description: 'Lerp factor for paddle movement (higher = smoother)'
    },

    // === Strategy ===
    defensiveThreshold: {
        min: 0.3, max: 0.7,
        description: 'X position ratio to switch to defensive mode'
    },
    offensiveAngling: {
        min: 0, max: 1,
        description: 'Attempt to angle returns for difficulty'
    },

    // === Imperfection ===
    errorRate: {
        min: 0, max: 0.3,
        description: 'Random error in target positioning'
    },
    jitterAmount: {
        min: 0, max: 5,
        description: 'Random movement noise in pixels'
    }
};
```

### Genome Operations

**Random Genome Creation:**
```javascript
function createRandomGenome() {
    const genome = {};
    for (const [gene, def] of Object.entries(GENE_DEFINITIONS)) {
        genome[gene] = def.min + Math.random() * (def.max - def.min);
    }
    return genome;
}
```

**Crossover (two parents → one child):**
```javascript
function crossover(parent1, parent2) {
    const child = {};
    for (const gene of Object.keys(GENE_DEFINITIONS)) {
        // Random selection per gene
        if (Math.random() < 0.5) {
            child[gene] = parent1[gene];
        } else {
            child[gene] = parent2[gene];
        }
        // 30% chance to blend instead
        if (Math.random() < 0.3) {
            const blend = Math.random();
            child[gene] = parent1[gene] * blend + parent2[gene] * (1 - blend);
        }
    }
    return child;
}
```

**Mutation:**
```javascript
function mutate(genome, mutationRate) {
    const mutated = { ...genome };
    for (const [gene, def] of Object.entries(GENE_DEFINITIONS)) {
        if (Math.random() < mutationRate) {
            const range = def.max - def.min;
            const mutation = (Math.random() - 0.5) * range * 0.4;
            mutated[gene] = clamp(mutated[gene] + mutation, def.min, def.max);
        }
    }
    return mutated;
}
```

---

## Player AI Architecture

### Player Class Structure

```javascript
class Player {
    // Identity
    name: string              // Generated unique name
    generation: number        // Which generation born in
    genome: object           // 12-gene genome

    // Lifetime Stats
    wins: number
    losses: number
    pointsFor: number
    pointsAgainst: number
    matchesPlayed: number
    fitness: number          // Calculated score

    // Runtime State
    reactionCounter: number  // Frames since last reaction
    lastTargetY: number      // Previous target position
    smoothedY: number        // Smoothed target for lerp
}
```

### AI Decision Algorithm

```javascript
calculateTarget(ball, paddle, isLeftSide) {
    // 1. Check reaction delay
    if (reactionCounter < genome.reactionDelay) {
        return lastTargetY;  // Don't react yet
    }

    // 2. Determine if ball coming toward us
    const ballComingToUs = isLeftSide ? ball.vx < 0 : ball.vx > 0;

    if (ballComingToUs) {
        // 3a. Calculate direct tracking position
        const trackY = ball.y;

        // 3b. Calculate predicted intercept position
        const framesToReach = |paddleX - ball.x| / |ball.vx|;
        let predictY = ball.y + ball.vy * framesToReach;
        // Handle wall bounces in prediction
        predictY = simulateBounces(predictY);

        // 3c. Combine tracking and prediction by weights
        targetY = (trackY * trackingWeight + predictY * predictionWeight)
                  / (trackingWeight + predictionWeight);

        // 3d. Apply sweet spot offset
        targetY += sweetSpotOffset * PADDLE_HEIGHT;

        // 3e. Offensive angling when ball close
        if (offensiveAngling > 0.5 && ballClose) {
            // Try to hit with paddle edge for angle
            targetY += angleDirection * PADDLE_HEIGHT * 0.3;
        }
    } else {
        // 4. Defensive positioning when ball going away
        targetY = blend(centerY, ball.y, centerBias);
    }

    // 5. Add imperfection
    targetY += randomError * errorRate;
    targetY += randomJitter * jitterAmount;

    // 6. Apply movement smoothing
    smoothedY = lerp(smoothedY, targetY, 1 - movementSmoothing);

    return smoothedY;
}
```

### Fitness Calculation

```javascript
calculateFitness() {
    if (matchesPlayed === 0) return 0;

    const winRate = wins / matchesPlayed;
    const pointDiff = pointsFor - pointsAgainst;
    const avgPointDiff = pointDiff / matchesPlayed;

    // Wins weighted heavily, point differential as tiebreaker
    fitness = (winRate * 1000) + (avgPointDiff * 10);
}
```

---

## Pong Game Engine

### Game State

```javascript
class PongGame {
    ball: { x, y, vx, vy }
    leftPaddle: { x, y }
    rightPaddle: { x, y }
    leftScore: number
    rightScore: number
    serving: boolean
    serveDirection: 1 | -1
}
```

### Ball Physics

```javascript
update() {
    // Move ball
    ball.x += ball.vx;
    ball.y += ball.vy;

    // Wall bounce (top/bottom)
    if (ball.y <= BALL_SIZE/2 || ball.y >= CANVAS_HEIGHT - BALL_SIZE/2) {
        ball.vy *= -1;
    }

    // Paddle collision
    if (ballHitsPaddle(paddle)) {
        // Calculate hit position (-1 to 1)
        const hitPos = (ball.y - paddle.y) / (PADDLE_HEIGHT / 2);

        // Reflect with angle based on hit position
        const angle = hitPos * (PI / 3);  // Max 60 degrees
        const speed = min(currentSpeed * 1.05, MAX_BALL_SPEED);

        ball.vx = speed * cos(angle) * direction;
        ball.vy = speed * sin(angle);
    }

    // Scoring (ball passes paddle)
    if (ball.x < 0) rightScore++;
    if (ball.x > CANVAS_WIDTH) leftScore++;
}
```

### Serve Mechanic

```javascript
serve() {
    ball.x = CANVAS_WIDTH / 2;
    ball.y = CANVAS_HEIGHT / 2;

    // Random angle within ±30 degrees
    const angle = (random() - 0.5) * (PI / 3);
    ball.vx = BALL_SPEED * serveDirection * cos(angle);
    ball.vy = BALL_SPEED * sin(angle);

    serveDirection *= -1;  // Alternate serve direction
}
```

---

## Tournament System

### Bracket Generation

```javascript
class Tournament {
    players: Player[]         // All participants
    bracket: Match[][]        // Rounds of matches
    matchesPerPairing: number // Best of N
    pointsToWin: number       // Points per game
}

generateBracket() {
    // Shuffle players randomly
    const shuffled = shuffle(players);

    // Create first round pairings
    for (i = 0; i < shuffled.length; i += 2) {
        round1.push({
            player1: shuffled[i],
            player2: shuffled[i+1] || null,  // Bye if odd
            winner: null,
            scores: [],
            completed: false
        });
    }

    // Create empty subsequent rounds
    // Winners advance to fill these
}
```

### Match Resolution

```javascript
recordResult(match, leftScore, rightScore) {
    match.scores.push({ left: leftScore, right: rightScore });

    // Check if series complete (best of N)
    const winsNeeded = ceil(matchesPerPairing / 2);
    let p1Wins = countWins(match.scores, 'left');
    let p2Wins = countWins(match.scores, 'right');

    if (p1Wins >= winsNeeded || p2Wins >= winsNeeded) {
        match.winner = p1Wins > p2Wins ? player1 : player2;
        match.completed = true;

        // Update player stats
        winner.wins++;
        loser.losses++;
        // Aggregate points...

        return true;  // Series complete
    }
    return false;  // More games needed
}
```

---

## Evolution Manager

### Population Lifecycle

```javascript
class EvolutionManager {
    population: Player[]
    generation: number
    tournamentCount: number
    allTimeStats: Map<string, Stats>
}
```

### Evolution Process

```javascript
evolve(mutationRate) {
    // 1. Calculate fitness for all
    population.forEach(p => p.calculateFitness());

    // 2. Sort by fitness (best first)
    population.sort((a, b) => b.fitness - a.fitness);

    // 3. Select survivors (top 50%)
    const survivors = population.slice(0, population.length / 2);

    // 4. Create new population
    const newPopulation = [];

    // 4a. Elitism: keep best performer unchanged
    const elite = survivors[0].clone();
    newPopulation.push(elite);

    // 4b. Breed to fill remaining slots
    while (newPopulation.length < targetSize) {
        const parent1 = tournamentSelect(survivors);
        const parent2 = tournamentSelect(survivors);
        const child = parent1.breed(parent2, mutationRate);
        newPopulation.push(child);
    }

    // 5. Replace population
    population = newPopulation;
    generation++;

    // 6. Reset stats for new tournament
    population.forEach(p => p.resetStats());
}
```

### Tournament Selection

```javascript
tournamentSelect(candidates, tournamentSize = 3) {
    let best = null;
    for (i = 0; i < tournamentSize; i++) {
        const candidate = randomChoice(candidates);
        if (!best || candidate.fitness > best.fitness) {
            best = candidate;
        }
    }
    return best;
}
```

---

## User Interface

### Control Panel Settings

| Setting | Range | Description |
|---------|-------|-------------|
| Population Size | 4-32 (even) | Number of AI players |
| Points to Win | 1-21 | Points needed to win single game |
| Matches per Pairing | 1-9 (odd) | Best-of-N series |
| Game Speed | 1-10x | Simulation speed multiplier |
| Mutation Rate | 1-50% | Chance of gene mutation |

### Display Components

1. **Game Canvas**: Real-time Pong match visualization
2. **Match Info**: Current players, scores, match status
3. **Tournament Bracket**: Visual bracket with winners highlighted
4. **Leaderboard**: All-time stats sorted by fitness
5. **Genome Viewer**: Inspect any player's 12 genes
6. **Event Log**: Match results and evolution events

### Color Scheme

- Background: `#0a0a0a`
- Panel background: `#1a1a1a`
- Accent (primary): `#00ff88`
- Left paddle: `#00ff88`
- Right paddle: `#ff8800`
- Text: `#e0e0e0`

---

## Implementation Guide

### Architecture Overview

```
1. Configuration constants
2. Gene definitions
3. Genetic operations (create, crossover, mutate)
4. Player class (genome, stats, AI logic)
5. PongGame class (physics, rendering)
6. Tournament class (bracket, matching)
7. EvolutionManager class (population, breeding)
8. GameController class (UI binding, game loop)
9. Event listeners and initialization
```

### Game Loop Structure

```javascript
gameLoop() {
    if (!isRunning || isPaused) return;

    // Run multiple updates per frame for speed
    for (i = 0; i < gameSpeed; i++) {
        const scored = game.update(leftPlayer, rightPlayer);

        if (scored) {
            updateScoreDisplay();

            if (gameWon) {
                tournament.recordResult(match, scores);

                if (matchSeriesComplete) {
                    startNextMatch();
                } else {
                    game.reset();  // Next game in series
                }
            }
        }
    }

    game.draw();
    requestAnimationFrame(gameLoop);
}
```

### Name Generation

```javascript
const NAME_PREFIXES = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon',
                       'Zeta', 'Eta', 'Theta', 'Omega', 'Sigma',
                       'Nova', 'Quantum', 'Cyber', 'Neo', 'Hyper'...];

const NAME_SUFFIXES = ['Prime', 'X', 'Zero', 'One', 'Max', 'Pro',
                       'Elite', 'Core', 'Net', 'Bot', 'Mind'...];

function generateName() {
    return `${randomPrefix}-${randomSuffix}-${counter++}`;
}
// Examples: "Alpha-Prime-1", "Quantum-Elite-42", "Neo-Bot-7"
```

---

## Emergent Behaviors to Observe

As generations progress, watch for:

1. **Prediction vs Tracking**: Do successful AIs rely more on prediction?
2. **Reaction Speed**: Does lower reaction delay always win?
3. **Error Tolerance**: Do some error rates provide beneficial unpredictability?
4. **Positioning Strategy**: Does aggressive or defensive play dominate?
5. **Convergence**: Do all genomes converge to similar values?
6. **Local Optima**: Do populations get stuck at suboptimal strategies?

---

## Extending the System

### Suggested Enhancements

1. **More Genes**: Add spin, power shots, or special abilities
2. **Speciation**: Prevent crossover between dissimilar genomes
3. **Niching**: Reward diversity to prevent convergence
4. **Co-evolution**: Separate populations that compete
5. **Save/Load**: Persist populations to localStorage
6. **Visualization**: Graph fitness over generations
7. **Neural Networks**: Replace genes with small neural nets
