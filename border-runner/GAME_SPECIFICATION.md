| | |
|---|---|
| **Last Updated** | 2025-12-19 |
| **Author** | Claude Code |
| **Version** | 1.0.0 |

# Border Runner - Game Specification

A 2D top-down open-world survival browser game where the player is a smuggler transporting contraband across a border wall.

## Table of Contents

- [Overview](#overview)
- [Technical Stack](#technical-stack)
- [File Structure](#file-structure)
- [Game Configuration](#game-configuration)
- [Core Systems](#core-systems)
- [Entity Specifications](#entity-specifications)
- [World Generation](#world-generation)
- [Game Mechanics](#game-mechanics)
- [User Interface](#user-interface)
- [Implementation Guide](#implementation-guide)

---

## Overview

### Concept
- **Genre**: 2D top-down survival/stealth
- **Theme**: Border smuggling simulation
- **Core Loop**: Collect packages south of wall → Navigate through wall gaps → Deliver to drop zones north of wall → Repeat

### Key Features
- WASD keyboard controls with sprint
- Persistent world state via localStorage
- Stealth mechanics (hiding in bushes)
- Patrol AI with detection and chase behavior
- Health, stamina, and wanted level systems
- Minimap navigation

---

## Technical Stack

```
Language: Vanilla JavaScript (ES6+)
Rendering: HTML5 Canvas 2D Context
Storage: localStorage for persistence
Server: Any static file server (e.g., python3 -m http.server)
Dependencies: None
```

---

## File Structure

```
game/
├── index.html      # HTML structure, canvas, UI overlay
├── style.css       # Styling for UI elements and screens
└── game.js         # Complete game logic (~700 lines)
```

---

## Game Configuration

```javascript
const GAME_CONFIG = {
    // Display
    CANVAS_WIDTH: 1200,
    CANVAS_HEIGHT: 800,

    // World
    WORLD_WIDTH: 4000,
    WORLD_HEIGHT: 3000,
    TILE_SIZE: 50,

    // Player
    PLAYER_SIZE: 30,
    PLAYER_SPEED: 4,
    SPRINT_MULTIPLIER: 1.8,
    MAX_CARGO: 5,

    // The Wall
    WALL_Y: 1500,           // Vertical center of world
    WALL_THICKNESS: 80,

    // Persistence
    SAVE_KEY: 'borderRunnerSave'
};
```

---

## Core Systems

### 1. Game State Structure

```javascript
gameState = {
    isRunning: boolean,
    isPaused: boolean,
    player: Player,
    camera: { x: number, y: number },
    entities: {
        packages: Package[],
        dropZones: DropZone[],
        patrols: Patrol[],
        obstacles: Obstacle[],
        bushes: Bush[]
    },
    stats: {
        health: 0-100,
        stamina: 0-100,
        wanted: 0-100,
        cash: number,
        totalDelivered: number
    },
    cargo: Package[],
    keys: { [keyCode: string]: boolean },
    lastTime: number,
    messageTimeout: number
}
```

### 2. Input System

| Key | Action |
|-----|--------|
| W / ArrowUp | Move up |
| A / ArrowLeft | Move left |
| S / ArrowDown | Move down |
| D / ArrowRight | Move right |
| Shift | Sprint (drains stamina) |
| E | Pick up package |
| Space | Drop cargo at drop zone |

**Implementation**:
- Use `keydown`/`keyup` events with `e.code`
- Store key states in object: `gameState.keys[e.code] = true/false`
- Prevent default for game keys
- Normalize diagonal movement by multiplying by 0.707

### 3. Camera System

```javascript
// Smooth follow with lerp
targetX = player.x - canvas.width / 2;
targetY = player.y - canvas.height / 2;
camera.x += (targetX - camera.x) * 0.1;
camera.y += (targetY - camera.y) * 0.1;

// Clamp to world bounds
camera.x = clamp(camera.x, 0, WORLD_WIDTH - CANVAS_WIDTH);
camera.y = clamp(camera.y, 0, WORLD_HEIGHT - CANVAS_HEIGHT);
```

### 4. Collision System

```javascript
// AABB collision check
function isCollidingWith(x, y, obj) {
    return x - width/2 < obj.x + obj.width &&
           x + width/2 > obj.x &&
           y - height/2 < obj.y + obj.height &&
           y + height/2 > obj.y;
}

// Wall collision with gap detection
function isCollidingWithWall(x, y) {
    if (y in wall_y_range) {
        for (gap of wallGaps) {
            if (x in gap.x_range) return false;
        }
        return true;
    }
    return false;
}
```

### 5. Persistence System

**Save Data Structure**:
```javascript
{
    player: { x, y },
    stats: { health, stamina, wanted, cash, totalDelivered },
    cargo: [{ value }],
    collectedPackages: [indices]
}
```

**Triggers**:
- Auto-save every 30 seconds
- Clear save on game over

---

## Entity Specifications

### Player

```javascript
class Player {
    x, y: number              // World position (center)
    width, height: 30         // Collision box
    speed: 4                  // Base movement speed
    direction: {x, y}         // Facing direction for rendering
    isHidden: boolean         // In bush = invisible to patrols
}
```

**Rendering**:
- Shadow ellipse below
- Dark circle body
- Smaller circle for head (offset by direction)
- Cargo count indicator above when carrying

### Patrol (Border Agent)

```javascript
class Patrol {
    x, y: number
    width, height: 35
    speed: 2                  // Patrol speed
    chaseSpeed: 3.5           // Pursuit speed
    detectionRadius: 150      // Pixels
    patrolPath: [{x, y}]      // Waypoints
    pathIndex: number
    isChasing: boolean
    alertTimer: number        // Frames remaining in alert
}
```

**AI Behavior**:
1. **Patrol Mode**: Follow waypoint path in loop
2. **Detection**: If player within radius AND not hidden → chase
3. **Chase Mode**: Move toward player, set alert timer (180 frames)
4. **Catch**: If within 30px → damage player, confiscate cargo
5. **Return**: After alert timer expires, resume patrol

### Package (Contraband)

```javascript
class Package {
    x, y: number
    width, height: 25
    value: 100-600            // Random cash value
    collected: boolean
    bobOffset: number         // For floating animation
}
```

### Drop Zone

```javascript
class DropZone {
    x, y: number
    width, height: 60
    name: string              // Display label
}
```

### Obstacle

```javascript
class Obstacle {
    x, y: number
    width, height: number
    type: 'cactus' | 'rock'
}
```

**Effects**: Collision causes minor health damage, blocks movement.

### Bush (Hiding Spot)

```javascript
class Bush {
    x, y: number
    width: 50, height: 40
}
```

**Effects**: Player inside bush sets `isHidden = true`, preventing patrol detection.

---

## World Generation

### The Wall

```javascript
// Horizontal barrier across entire world
wallY = WORLD_HEIGHT / 2 (1500)
wallThickness = 80

// Gaps (passable openings)
wallGaps = [
    { x: 500, width: 80 },
    { x: 1500, width: 80 },
    { x: 2800, width: 80 },
    { x: 3500, width: 80 }
]
```

### Entity Placement

| Entity | Count | Location | Notes |
|--------|-------|----------|-------|
| Packages | 20 | South of wall | Random positions, 100-200px from wall |
| Drop Zones | 4 | North of wall | Fixed positions at y=200-500 |
| Patrols | 8 | Along wall | Patrol paths cross wall boundary |
| Obstacles | 40 | Everywhere | Avoid wall zone |
| Bushes | 30 | Everywhere | Avoid wall zone |

### Terrain Zones

- **North (USA)**: Lighter green tint overlay
- **South (Mexico)**: Desert tan base color
- **Wall Zone**: Brown with segment details

---

## Game Mechanics

### Stat Systems

| Stat | Range | Regeneration | Depletion |
|------|-------|--------------|-----------|
| Health | 0-100 | None | Wall collision, obstacle collision, patrol catch |
| Stamina | 0-100 | +0.2/frame when not sprinting | -0.5/frame when sprinting |
| Wanted | 0-100 | -0.02/frame passive decay | +0.3/frame when detected, +0.05 on wall collision |

### Game Over Conditions

1. **Health <= 0**: "You ran out of health!"
2. **Wanted >= 100**: "Maximum wanted level reached! The feds got you!"

### Scoring

```javascript
// Delivery bonus reduced by wanted level
bonus = packageValue * (1 - wantedLevel / 200)

// Delivering reduces wanted
wantedLevel -= 10
```

### Interaction Distances

| Action | Distance (pixels) |
|--------|-------------------|
| Package pickup | 40 |
| Cargo drop | 100 |
| Patrol catch | 30 |
| Patrol detection | 150 |

---

## User Interface

### HUD Elements

```
┌─────────────────────┐  ┌─────────┐
│ Health:  [████████] │  │ MINIMAP │
│ Stamina: [████████] │  │         │
│ Wanted:  [██      ] │  │         │
│ Cash:    $1250      │  └─────────┘
│ Cargo:   3/5        │
└─────────────────────┘
```

### Minimap

- Scale: canvas dimensions / world dimensions
- Shows: packages (green), drop zones (orange), patrols (blue), player (red), wall (brown), gaps (orange)
- Viewport rectangle showing current camera view

### Screens

1. **Start Screen**: Title, controls info, Start/Continue buttons
2. **Game Over Screen**: Reason, final score, Restart button

### Message System

- Centered bottom notification box
- Auto-hide after duration (default 2000ms)
- Used for: pickups, deliveries, warnings, hints

---

## Implementation Guide

### Step 1: HTML Structure

```html
<div id="game-container">
    <canvas id="gameCanvas"></canvas>
    <div id="ui-overlay">
        <!-- Stats panel with bars -->
        <!-- Minimap canvas -->
        <!-- Message box -->
    </div>
    <div id="start-screen" class="screen">...</div>
    <div id="game-over-screen" class="screen">...</div>
</div>
```

### Step 2: CSS Requirements

- Fixed game container with border
- Absolute positioned UI overlay (pointer-events: none)
- Stat bars with gradient fills and transitions
- Screen overlays with flexbox centering
- Retro monospace font (Courier New)

### Step 3: JavaScript Architecture

```
1. Configuration constants
2. Game state object
3. Canvas setup
4. UI element references
5. Entity classes (Player, Patrol, Package, DropZone, Obstacle, Bush)
6. World initialization function
7. Drawing functions (world, minimap)
8. Update functions (player, patrols, camera)
9. Interaction checks
10. UI update function
11. Game loop (requestAnimationFrame)
12. Save/load functions
13. Event listeners
14. Game start/restart functions
```

### Step 4: Game Loop Structure

```javascript
function gameLoop(currentTime) {
    if (!gameState.isRunning) return;

    const deltaTime = currentTime - gameState.lastTime;
    gameState.lastTime = currentTime;

    // Update phase
    player.update(deltaTime);
    patrols.forEach(p => p.update(deltaTime, player));
    decayWantedLevel();
    checkInteractions();
    updateCamera();

    // Check game over
    if (health <= 0 || wanted >= 100) {
        gameOver(reason);
        return;
    }

    // Render phase
    drawWorld(currentTime);
    drawMinimap();
    updateUI();

    // Auto-save check
    if (shouldAutoSave(currentTime)) saveGame();

    requestAnimationFrame(gameLoop);
}
```

### Step 5: Key Rendering Details

**World layers (back to front)**:
1. Background terrain color
2. Grid lines
3. Terrain zone overlays
4. The Wall with gaps
5. Bushes
6. Obstacles
7. Packages
8. Drop zones
9. Patrols
10. Player

**Screen-space conversion**:
```javascript
screenX = worldX - camera.x
screenY = worldY - camera.y
```

---

## Extending the Game

### Suggested Enhancements

1. **Vehicles**: Faster movement, larger cargo capacity
2. **Upgrades**: Speed, stamina, detection radius reduction
3. **Multiple wall layers**: Increasing difficulty
4. **Day/night cycle**: Affects patrol detection range
5. **Sound effects**: Movement, pickup, alert, delivery
6. **Procedural world**: Randomized wall gaps, entity placement
7. **Leaderboard**: High score tracking
8. **Mobile support**: Touch controls

### Code Extension Points

- Add new entity types by creating class with `update()` and `draw()` methods
- Add to `gameState.entities` and include in `initWorld()`
- Add rendering call in `drawWorld()` at appropriate layer
- Add update call in game loop if entity has behavior
