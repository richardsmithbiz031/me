import unittest
from datetime import date, timedelta

from server import build_confirmation_message, validate_reservation


class ReservationValidationTests(unittest.TestCase):
    def test_valid_reservation(self):
        payload = {"name": "Aisha", "date": (date.today() + timedelta(days=3)).isoformat(), "guests": "2 guests"}
        self.assertEqual(validate_reservation(payload), payload)

    def test_rejects_past_date(self):
        payload = {"name": "Aisha", "date": (date.today() - timedelta(days=1)).isoformat(), "guests": "2 guests"}
        with self.assertRaisesRegex(ValueError, "past"):
            validate_reservation(payload)

    def test_builds_confirmation_message(self):
        message = build_confirmation_message("Aisha", "2099-11-13", "4 guests")
        self.assertIn("Aisha", message)
        self.assertIn("4 guests", message)
        self.assertIn("November", message)


if __name__ == "__main__":
    unittest.main()
