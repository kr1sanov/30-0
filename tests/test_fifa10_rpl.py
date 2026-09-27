"""Integrity checks against the complete user supplied FIFA 10 pages."""
import importlib.util
import json
import shutil
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT.parent / "upload"
EXPORT = ROOT / "docs/research/verified-fifa10-rpl.json"
SPEC = importlib.util.spec_from_file_location("fifa10", ROOT / "scripts/prepare-fifa10-rpl.py")
module = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(module)


class Fifa10ImportTest(unittest.TestCase):
    def test_export_retains_every_source_value(self):
        if not INPUT.exists():
            self.skipTest("User supplied source pages are not present in this checkout")
        expected = module.parse(INPUT, {})
        self.assertEqual(expected, json.loads(EXPORT.read_text()))
        self.assertEqual(expected["audit"]["players"], 469)
        self.assertEqual(expected["audit"]["clubs"], 16)
        self.assertEqual(expected["audit"]["namesAsSource"], 469)
        by_id = {p["sourcePlayerId"]: p for club in expected["clubs"] for p in club["players"]}
        self.assertEqual((by_id["140798"]["rating"], by_id["140798"]["primeRating"]), (74, 78))
        self.assertEqual((by_id["147794"]["rating"], by_id["147794"]["primeRating"]), (83, 86))
        self.assertEqual(by_id["147794"]["nameRu"], "Vyacheslav Malafeev")
        self.assertEqual(expected["season"]["startYear"], 2009)

    def test_incomplete_source_rejected(self):
        if not INPUT.exists():
            self.skipTest("User supplied source pages are not present in this checkout")
        with tempfile.TemporaryDirectory() as tmp:
            for path in INPUT.glob("*.md"):
                if path.name != "deep-research-report.md":
                    shutil.copy2(path, tmp)
            page = Path(tmp) / "Zenit St. Petersburg.md"
            page.write_text("\n".join(line for line in page.read_text().splitlines() if "147794-vyacheslav" not in line))
            with self.assertRaisesRegex(ValueError, "Неполный состав"):
                module.parse(Path(tmp), {})


if __name__ == "__main__":
    unittest.main()
