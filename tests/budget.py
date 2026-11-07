"""Test the exact quota SQL locally. No Cloudflare resources or email are used."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import re, sqlite3, tempfile, unittest
ROOT = Path(__file__).resolve().parents[1]
SCHEMA = (ROOT / 'schema/contact-budget.sql').read_text()
SQL = re.search(r'prepare\(`(.*?)`\)', (ROOT / 'worker/budget.mjs').read_text(), re.S).group(1)

class BudgetTest(unittest.TestCase):
 def setUp(self):
  self.temp = tempfile.TemporaryDirectory()
  self.path = str(Path(self.temp.name) / 'quota.sqlite')
  with sqlite3.connect(self.path) as c: c.executescript(SCHEMA)
 def tearDown(self): self.temp.cleanup()
 def reserve(self, day=20000, hour=480000, daily=100, hourly=20):
  with sqlite3.connect(self.path, timeout=10) as c:
   c.create_function('unixepoch', 0, lambda: day * 86400 + (hour % 24) * 3600)
   return c.execute(SQL, (daily, hourly)).fetchone()
 def test_hourly_cap(self):
  self.assertTrue(self.reserve(hourly=2)); self.assertTrue(self.reserve(hourly=2)); self.assertIsNone(self.reserve(hourly=2))
 def test_daily_cap_across_hours(self):
  self.assertTrue(self.reserve(daily=2)); self.assertTrue(self.reserve(hour=480001,daily=2)); self.assertIsNone(self.reserve(hour=480002,daily=2))
 def test_hour_reset_preserves_day(self):
  self.assertEqual(self.reserve(hourly=1), (1,1)); self.assertEqual(self.reserve(hour=480001,hourly=1), (2,1))
 def test_day_reset(self):
  self.assertEqual(self.reserve(daily=1), (1,1)); self.assertEqual(self.reserve(day=20001,hour=480024,daily=1), (1,1))
 def test_concurrent_reservations_cannot_exceed_cap(self):
  with ThreadPoolExecutor(max_workers=16) as pool: results = list(pool.map(lambda _: self.reserve(hourly=7), range(50)))
  self.assertEqual(sum(r is not None for r in results), 7)
 def test_edge_clock_cannot_reset_database_window(self):
  # Caller timestamps are deliberately absent from the query's parameters.
  self.assertNotIn('?3', SQL)
  self.assertIn('unixepoch()', SQL)
  self.assertEqual(self.reserve(hour=480001,hourly=1),(1,1))
  # A delayed edge request is evaluated at the same current database hour.
  self.assertIsNone(self.reserve(hour=480001,hourly=1))
  self.assertIsNone(self.reserve(hour=480001,hourly=1))
 def test_missing_row_fails_closed(self):
  with sqlite3.connect(self.path) as c: c.execute('DELETE FROM contact_send_budget')
  self.assertIsNone(self.reserve())
 def test_reapplying_schema_does_not_reset_budget(self):
  self.reserve()
  with sqlite3.connect(self.path) as c: c.executescript(SCHEMA)
  self.assertEqual(self.reserve(), (2,2))
if __name__ == '__main__': unittest.main()
