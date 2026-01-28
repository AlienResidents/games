"""Genetic Algorithm implementation for Pong paddle controllers."""

import random
import uuid
from dataclasses import dataclass, field
from typing import List, Tuple


@dataclass
class Chromosome:
    """Represents a paddle AI's genetic makeup."""

    genes: List[float] = field(default_factory=list)
    id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    name: str = ""
    fitness: float = 0.0
    wins: int = 0
    losses: int = 0
    points_scored: int = 0
    points_conceded: int = 0
    generation: int = 0

    # Gene indices
    REACTION_TIME = 0      # How quickly it responds (0=slow, 1=instant)
    PREDICTION_DEPTH = 1   # How far ahead it predicts (0=none, 1=full trajectory)
    AGGRESSION = 2         # Move toward predicted vs stay centered (0=defensive, 1=aggressive)
    NOISE_TOLERANCE = 3    # Random movement factor (0=deterministic, 1=chaotic)
    SPEED_SCALING = 4      # Max movement speed multiplier (0=slow, 1=fast)
    ANTICIPATION = 5       # Weight velocity vs position (0=position only, 1=velocity focused)

    NUM_GENES = 6

    def __post_init__(self):
        if not self.genes:
            self.genes = [random.random() for _ in range(self.NUM_GENES)]
            # Ensure minimum values for playable AI
            self.genes[self.AGGRESSION] = 0.5 + self.genes[self.AGGRESSION] * 0.5  # 0.5-1.0
            self.genes[self.SPEED_SCALING] = 0.6 + self.genes[self.SPEED_SCALING] * 0.4  # 0.6-1.0
            self.genes[self.REACTION_TIME] = 0.4 + self.genes[self.REACTION_TIME] * 0.6  # 0.4-1.0
        if not self.name:
            self.name = self._generate_name()

    def _generate_name(self) -> str:
        """Generate a fun name based on genetic traits."""
        prefixes = ["Swift", "Steady", "Crazy", "Calm", "Hyper", "Zen", "Wild", "Cool"]
        suffixes = ["Bot", "AI", "Mind", "Brain", "Core", "Net", "Byte", "Bit"]

        # Use gene values to deterministically pick name parts
        prefix_idx = int(sum(self.genes[:3]) * 100) % len(prefixes)
        suffix_idx = int(sum(self.genes[3:]) * 100) % len(suffixes)

        return f"{prefixes[prefix_idx]}{suffixes[suffix_idx]}-{self.id}"

    @property
    def reaction_time(self) -> float:
        return self.genes[self.REACTION_TIME]

    @property
    def prediction_depth(self) -> float:
        return self.genes[self.PREDICTION_DEPTH]

    @property
    def aggression(self) -> float:
        return self.genes[self.AGGRESSION]

    @property
    def noise_tolerance(self) -> float:
        return self.genes[self.NOISE_TOLERANCE]

    @property
    def speed_scaling(self) -> float:
        return self.genes[self.SPEED_SCALING]

    @property
    def anticipation(self) -> float:
        return self.genes[self.ANTICIPATION]

    def reset_stats(self):
        """Reset match statistics for a new tournament."""
        self.fitness = 0.0
        self.wins = 0
        self.losses = 0
        self.points_scored = 0
        self.points_conceded = 0

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "id": self.id,
            "name": self.name,
            "genes": self.genes,
            "fitness": self.fitness,
            "wins": self.wins,
            "losses": self.losses,
            "points_scored": self.points_scored,
            "points_conceded": self.points_conceded,
            "generation": self.generation,
            "traits": {
                "reaction_time": self.reaction_time,
                "prediction_depth": self.prediction_depth,
                "aggression": self.aggression,
                "noise_tolerance": self.noise_tolerance,
                "speed_scaling": self.speed_scaling,
                "anticipation": self.anticipation,
            }
        }


def crossover(parent1: Chromosome, parent2: Chromosome, generation: int) -> Tuple[Chromosome, Chromosome]:
    """Create two offspring through crossover of parent genes."""
    # Single-point crossover
    crossover_point = random.randint(1, Chromosome.NUM_GENES - 1)

    child1_genes = parent1.genes[:crossover_point] + parent2.genes[crossover_point:]
    child2_genes = parent2.genes[:crossover_point] + parent1.genes[crossover_point:]

    # Uniform crossover for some gene mixing
    for i in range(Chromosome.NUM_GENES):
        if random.random() < 0.1:  # 10% chance per gene
            child1_genes[i], child2_genes[i] = child2_genes[i], child1_genes[i]

    child1 = Chromosome(genes=child1_genes, generation=generation)
    child2 = Chromosome(genes=child2_genes, generation=generation)

    return child1, child2


def mutate(chromosome: Chromosome, mutation_rate: float = 0.1, mutation_strength: float = 0.2) -> Chromosome:
    """Apply random mutations to a chromosome."""
    mutated_genes = chromosome.genes.copy()

    # Minimum values for key genes to ensure playable AI
    gene_mins = {
        Chromosome.AGGRESSION: 0.5,
        Chromosome.SPEED_SCALING: 0.6,
        Chromosome.REACTION_TIME: 0.4,
    }

    for i in range(len(mutated_genes)):
        if random.random() < mutation_rate:
            # Gaussian mutation
            mutation = random.gauss(0, mutation_strength)
            min_val = gene_mins.get(i, 0.0)
            mutated_genes[i] = max(min_val, min(1.0, mutated_genes[i] + mutation))

    chromosome.genes = mutated_genes
    chromosome.name = chromosome._generate_name()  # Regenerate name if genes changed significantly
    return chromosome


def calculate_fitness(chromosome: Chromosome) -> float:
    """Calculate fitness score based on tournament performance."""
    # Weighted scoring:
    # - Wins are most important
    # - Point differential matters
    # - Points scored show offensive capability

    win_weight = 100.0
    point_diff_weight = 10.0
    points_scored_weight = 1.0

    point_diff = chromosome.points_scored - chromosome.points_conceded

    fitness = (
        chromosome.wins * win_weight +
        point_diff * point_diff_weight +
        chromosome.points_scored * points_scored_weight
    )

    chromosome.fitness = fitness
    return fitness


def select_parents(population: List[Chromosome], num_parents: int) -> List[Chromosome]:
    """Select parents for breeding using tournament selection."""
    parents = []

    for _ in range(num_parents):
        # Tournament selection: pick 3 random individuals, select the fittest
        tournament_size = min(3, len(population))
        tournament = random.sample(population, tournament_size)
        winner = max(tournament, key=lambda c: c.fitness)
        parents.append(winner)

    return parents


def evolve_population(population: List[Chromosome], generation: int) -> List[Chromosome]:
    """Evolve the population after a tournament."""
    # Sort by fitness
    sorted_pop = sorted(population, key=lambda c: c.fitness, reverse=True)

    # Top 50% survive unchanged (elitism)
    survivors = sorted_pop[:len(sorted_pop) // 2]

    # Create offspring to replace bottom 50%
    offspring = []
    num_offspring_needed = len(population) - len(survivors)

    while len(offspring) < num_offspring_needed:
        # Select two parents
        parents = select_parents(survivors, 2)

        # Crossover
        child1, child2 = crossover(parents[0], parents[1], generation)

        # Mutate
        child1 = mutate(child1)
        child2 = mutate(child2)

        offspring.extend([child1, child2])

    # Trim if we created too many
    offspring = offspring[:num_offspring_needed]

    # Reset stats for survivors
    for survivor in survivors:
        survivor.reset_stats()
        survivor.generation = generation

    # Combine survivors and offspring
    new_population = survivors + offspring

    return new_population


def create_initial_population(size: int) -> List[Chromosome]:
    """Create an initial random population."""
    return [Chromosome(generation=0) for _ in range(size)]
