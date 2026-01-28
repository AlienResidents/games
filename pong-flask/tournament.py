"""Tournament bracket system for Pong evolution."""

import random
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any

from genetic import Chromosome, calculate_fitness, evolve_population


@dataclass
class Match:
    """A single match between two competitors."""

    match_id: int
    round_num: int
    player1: Optional[Chromosome] = None
    player2: Optional[Chromosome] = None
    winner: Optional[Chromosome] = None
    player1_score: int = 0
    player2_score: int = 0
    completed: bool = False

    def to_dict(self) -> dict:
        return {
            "match_id": self.match_id,
            "round_num": self.round_num,
            "player1": self.player1.to_dict() if self.player1 else None,
            "player2": self.player2.to_dict() if self.player2 else None,
            "winner": self.winner.to_dict() if self.winner else None,
            "player1_score": self.player1_score,
            "player2_score": self.player2_score,
            "completed": self.completed
        }


@dataclass
class Tournament:
    """Single elimination tournament bracket."""

    population: List[Chromosome]
    generation: int = 0
    rounds: List[List[Match]] = field(default_factory=list)
    current_round: int = 0
    current_match_idx: int = 0
    completed: bool = False
    champion: Optional[Chromosome] = None

    def __post_init__(self):
        self._generate_bracket()

    def _generate_bracket(self):
        """Generate single elimination bracket."""
        # Shuffle population for random seeding
        shuffled = self.population.copy()
        random.shuffle(shuffled)

        self.rounds = []

        # First round
        first_round_matches = []
        match_id = 0

        for i in range(0, len(shuffled), 2):
            match = Match(
                match_id=match_id,
                round_num=0,
                player1=shuffled[i],
                player2=shuffled[i + 1] if i + 1 < len(shuffled) else None
            )

            # Handle bye (odd number of players)
            if match.player2 is None:
                match.winner = match.player1
                match.completed = True

            first_round_matches.append(match)
            match_id += 1

        self.rounds.append(first_round_matches)

        # Generate subsequent rounds (empty until filled by winners)
        num_players = len(shuffled)
        round_num = 1
        matches_in_round = len(first_round_matches) // 2

        while matches_in_round >= 1:
            round_matches = []
            for i in range(matches_in_round):
                match = Match(match_id=match_id, round_num=round_num)
                round_matches.append(match)
                match_id += 1

            self.rounds.append(round_matches)
            matches_in_round //= 2
            round_num += 1

    def get_current_match(self) -> Optional[Match]:
        """Get the next match to be played."""
        if self.completed:
            return None

        while self.current_round < len(self.rounds):
            round_matches = self.rounds[self.current_round]

            while self.current_match_idx < len(round_matches):
                match = round_matches[self.current_match_idx]

                if not match.completed:
                    # Check if players are assigned (for later rounds)
                    if match.player1 is None or match.player2 is None:
                        # Need to wait for previous round to complete
                        self._advance_winners()
                        if match.player1 is None or match.player2 is None:
                            return None

                    return match

                self.current_match_idx += 1

            self.current_match_idx = 0
            self.current_round += 1
            self._advance_winners()

        self.completed = True
        self._determine_champion()
        return None

    def _advance_winners(self):
        """Advance winners to next round matches."""
        if self.current_round >= len(self.rounds):
            return

        for round_idx in range(len(self.rounds) - 1):
            round_matches = self.rounds[round_idx]
            next_round = self.rounds[round_idx + 1]

            for i, match in enumerate(round_matches):
                if match.completed and match.winner:
                    next_match_idx = i // 2
                    if next_match_idx < len(next_round):
                        next_match = next_round[next_match_idx]

                        if i % 2 == 0:
                            next_match.player1 = match.winner
                        else:
                            next_match.player2 = match.winner

    def record_match_result(self, match: Match, winner: Chromosome,
                            player1_score: int, player2_score: int):
        """Record the result of a completed match."""
        match.winner = winner
        match.player1_score = player1_score
        match.player2_score = player2_score
        match.completed = True

        # Update fitness scores
        calculate_fitness(match.player1)
        calculate_fitness(match.player2)

        self.current_match_idx += 1

    def _determine_champion(self):
        """Determine tournament champion."""
        if self.rounds and self.rounds[-1]:
            final_match = self.rounds[-1][0]
            if final_match.completed:
                self.champion = final_match.winner

    def get_bracket_state(self) -> Dict[str, Any]:
        """Get full bracket state for display."""
        return {
            "generation": self.generation,
            "rounds": [[m.to_dict() for m in round_matches] for round_matches in self.rounds],
            "current_round": self.current_round,
            "current_match_idx": self.current_match_idx,
            "completed": self.completed,
            "champion": self.champion.to_dict() if self.champion else None,
            "total_rounds": len(self.rounds)
        }

    def get_standings(self) -> List[Dict[str, Any]]:
        """Get current standings sorted by fitness."""
        sorted_pop = sorted(self.population, key=lambda c: c.fitness, reverse=True)
        return [c.to_dict() for c in sorted_pop]


class TournamentManager:
    """Manages multiple tournament generations."""

    def __init__(self, population_size: int = 32):
        self.population_size = population_size
        self.population: List[Chromosome] = []
        self.current_tournament: Optional[Tournament] = None
        self.generation: int = 0
        self.tournament_history: List[Dict[str, Any]] = []
        self.tournaments_to_run: int = 1
        self.tournaments_completed: int = 0

    def initialize(self):
        """Initialize with random population."""
        from genetic import create_initial_population
        self.population = create_initial_population(self.population_size)
        self.generation = 0

    def start_tournament(self, num_tournaments: int = 1):
        """Start a new tournament (or series of tournaments)."""
        self.tournaments_to_run = num_tournaments
        self.tournaments_completed = 0
        self._start_single_tournament()

    def _start_single_tournament(self):
        """Start a single tournament."""
        # Reset stats for all players
        for p in self.population:
            p.reset_stats()

        self.current_tournament = Tournament(
            population=self.population,
            generation=self.generation
        )

    def get_next_match(self) -> Optional[Match]:
        """Get the next match to play."""
        if not self.current_tournament:
            return None
        return self.current_tournament.get_current_match()

    def record_match(self, match: Match, winner: Chromosome,
                     player1_score: int, player2_score: int):
        """Record match result."""
        if self.current_tournament:
            self.current_tournament.record_match_result(
                match, winner, player1_score, player2_score
            )

    def check_tournament_complete(self) -> bool:
        """Check if current tournament is complete and handle evolution."""
        if not self.current_tournament:
            return True

        # Refresh tournament state
        self.current_tournament.get_current_match()

        if self.current_tournament.completed:
            self.tournaments_completed += 1

            # Record history
            self.tournament_history.append({
                "generation": self.generation,
                "champion": self.current_tournament.champion.to_dict() if self.current_tournament.champion else None,
                "standings": self.current_tournament.get_standings()
            })

            # Check if more tournaments to run
            if self.tournaments_completed < self.tournaments_to_run:
                # Evolve and start next tournament
                self.generation += 1
                self.population = evolve_population(self.population, self.generation)
                self._start_single_tournament()
                return False
            else:
                return True

        return False

    def get_state(self) -> Dict[str, Any]:
        """Get full manager state."""
        return {
            "generation": self.generation,
            "population_size": self.population_size,
            "tournaments_to_run": self.tournaments_to_run,
            "tournaments_completed": self.tournaments_completed,
            "tournament": self.current_tournament.get_bracket_state() if self.current_tournament else None,
            "standings": self.current_tournament.get_standings() if self.current_tournament else [],
            "history": self.tournament_history[-10:] if self.tournament_history else []  # Last 10
        }
