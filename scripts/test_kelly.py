#!/usr/bin/env python3
"""Tests for kelly.py - TDD approach."""
import unittest
from kelly import kelly


class TestKellyCalculator(unittest.TestCase):
    """Test cases for Kelly criterion calculator."""

    def test_zero_odds_returns_do_not_bet(self):
        """BUG FIX: odds=0 should not crash, should return DO NOT BET."""
        result = kelly(prob_win=0.5, odds=0)
        self.assertFalse(result["edge_exists"])
        self.assertEqual(result["recommendation"], "DO NOT BET")

    def test_negative_odds_returns_do_not_bet(self):
        """Negative odds are invalid, should return DO NOT BET."""
        result = kelly(prob_win=0.5, odds=-1)
        self.assertFalse(result["edge_exists"])
        self.assertEqual(result["recommendation"], "DO NOT BET")

    def test_valid_positive_edge(self):
        """Standard case: 60% win prob, 2:1 odds = positive edge."""
        result = kelly(prob_win=0.6, odds=2.0)
        self.assertTrue(result["edge_exists"])
        self.assertGreater(result["full_kelly_pct"], 0)

    def test_no_edge_returns_do_not_bet(self):
        """30% win prob, 1:1 odds = no edge."""
        result = kelly(prob_win=0.3, odds=1.0)
        self.assertFalse(result["edge_exists"])
        self.assertEqual(result["recommendation"], "DO NOT BET")

    def test_fractional_kelly_applied(self):
        """Fractional Kelly should reduce full Kelly by fraction."""
        result = kelly(prob_win=0.6, odds=2.0, fraction=0.25)
        self.assertAlmostEqual(
            result["fractional_kelly_pct"],
            result["full_kelly_pct"] * 0.25,
            places=2
        )

    def test_probability_out_of_range_handled(self):
        """prob_win > 1 or < 0 should be handled gracefully."""
        result_high = kelly(prob_win=1.5, odds=2.0)
        result_low = kelly(prob_win=-0.1, odds=2.0)
        # Should not crash, and should flag as invalid/no bet
        self.assertIn("edge_exists", result_high)
        self.assertIn("edge_exists", result_low)


if __name__ == "__main__":
    unittest.main()
