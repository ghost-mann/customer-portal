import frappe
import unittest

from customer_portal.api.store import _price_range


class TestPriceRange(unittest.TestCase):
    def test_empty_rows(self):
        self.assertEqual(_price_range([]), (None, None, False))

    def test_min_max_and_stock(self):
        rows = [
            {"rate": 0.55, "stock_qty": 0},
            {"rate": 0.35, "stock_qty": 500},
            {"rate": 0.42, "stock_qty": 0},
        ]
        self.assertEqual(_price_range(rows), (0.35, 0.55, True))

    def test_all_out_of_stock(self):
        rows = [{"rate": 1.0, "stock_qty": 0}, {"rate": 2.0, "stock_qty": None}]
        self.assertEqual(_price_range(rows), (1.0, 2.0, False))

    def test_ignores_missing_rate(self):
        rows = [{"rate": None, "stock_qty": 5}, {"rate": 0.9, "stock_qty": 0}]
        self.assertEqual(_price_range(rows), (0.9, 0.9, True))
