import json
import mimetypes
from datetime import date
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

PORT = 3000
ROOT = Path(__file__).resolve().parent
RESERVATIONS_FILE = ROOT / "reservations.json"


def get_local_today() -> str:
    return date.today().isoformat()


def validate_reservation(payload: dict):
    name = str(payload.get("name", "")).strip()
    reservation_date = str(payload.get("date", "")).strip()
    guests = str(payload.get("guests", "")).strip()

    if not name:
        raise ValueError("Please enter your name.")
    if not reservation_date:
        raise ValueError("Please choose a reservation date.")
    if len(reservation_date) != 10 or reservation_date[4] != "-" or reservation_date[7] != "-":
        raise ValueError("Please use a valid date format.")
    if not guests:
        raise ValueError("Please choose the number of guests.")

    try:
        if date.fromisoformat(reservation_date) < date.fromisoformat(get_local_today()):
            raise ValueError("Please choose a date that is not in the past.")
    except ValueError as exc:
        if "past" in str(exc).lower():
            raise
        raise ValueError("Please use a valid date format.") from exc

    return {"name": name, "date": reservation_date, "guests": guests}


def build_confirmation_message(name: str, date_str: str, guests: str) -> str:
    formatted = date.fromisoformat(date_str).strftime("%B %d")
    return (
        f"Thanks, {name}. Your table request for {formatted} for {guests} is ready — "
        "our team will be in touch to confirm."
    )


def read_reservations() -> list[dict]:
    try:
        with RESERVATIONS_FILE.open("r", encoding="utf-8") as file:
            data = json.load(file)
            return data if isinstance(data, list) else []
    except (FileNotFoundError, json.JSONDecodeError):
        return []


def write_reservations(reservations: list[dict]):
    with RESERVATIONS_FILE.open("w", encoding="utf-8") as file:
        json.dump(reservations, file, indent=2)


class ReservationHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_POST(self):
        parsed_url = urlparse(self.path)
        if parsed_url.path != "/api/reserve":
            self.send_response(404)
            self.end_headers()
            return

        content_length = int(self.headers.get("Content-Length", "0"))
        raw_body = self.rfile.read(content_length).decode("utf-8")

        try:
            payload = json.loads(raw_body or "{}")
            reservation = validate_reservation(payload)
            reservation_record = {
                "id": __import__("time").time_ns(),
                **reservation,
                "createdAt": __import__("datetime").datetime.utcnow().isoformat() + "Z",
            }
            reservations = read_reservations()
            reservations.append(reservation_record)
            write_reservations(reservations)

            message = build_confirmation_message(
                reservation["name"],
                reservation["date"],
                reservation["guests"],
            )
            self._send_json(200, {"success": True, "message": message, "reservation": reservation_record})
        except Exception as exc:  # noqa: BLE001
            self._send_json(400, {"success": False, "error": str(exc)})

    def do_GET(self):
        parsed = urlparse(self.path)
        request_path = parsed.path

        if request_path == "/api/reservations":
            self._send_json(200, {"success": True, "reservations": read_reservations()})
            return

        if request_path == "/":
            request_path = "/index.html"

        target = (ROOT / request_path.lstrip("/")).resolve()
        if ROOT not in target.parents and target != ROOT:
            self.send_error(403, "Forbidden")
            return

        if not target.exists() or not target.is_file():
            self.send_error(404, "Not found")
            return

        mime_type, _ = mimetypes.guess_type(str(target))
        if mime_type is None:
            mime_type = "application/octet-stream"

        self.send_response(200)
        self.send_header("Content-Type", mime_type)
        self.end_headers()
        with target.open("rb") as file:
            self.wfile.write(file.read())

    def _send_json(self, status_code: int, payload: dict):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def main():
    server = ThreadingHTTPServer(("0.0.0.0", PORT), ReservationHandler)
    print(f"Server running on http://localhost:{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    main()
