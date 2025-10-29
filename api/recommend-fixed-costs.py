"""
Vercel Serverless Function: Fixed Cost Recommendation API
==========================================================

POST /api/recommend-fixed-costs
Body: {
  "year_month": "2025-10",
  "user_id": "uuid-here"
}

Response: {
  "success": true,
  "updated_count": 5,
  "details": [...],
  "errors": []
}
"""

import sys
import os
import json
from http.server import BaseHTTPRequestHandler

# Add parent directory to path to import agents module
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

try:
    from agents.fixed_cost_recommender import run_recommendation_workflow
except ImportError:
    # If running in Vercel, the module might be in a different location
    # Try to import the core functions directly
    run_recommendation_workflow = None


class handler(BaseHTTPRequestHandler):
    """Vercel Serverless Function Handler"""

    def _set_headers(self, status_code=200, content_type="application/json"):
        """Set response headers"""
        self.send_response(status_code)
        self.send_header("Content-Type", content_type)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def _send_json(self, data, status_code=200):
        """Send JSON response"""
        self._set_headers(status_code)
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode("utf-8"))

    def _send_error(self, message, status_code=400):
        """Send error response"""
        self._send_json({
            "success": False,
            "error": message,
            "updated_count": 0,
            "details": [],
            "errors": [message]
        }, status_code)

    def do_OPTIONS(self):
        """Handle CORS preflight"""
        self._set_headers(204)

    def do_POST(self):
        """Handle POST request"""
        try:
            # Check if workflow function is available
            if run_recommendation_workflow is None:
                self._send_error("Recommendation workflow not available", 500)
                return

            # Parse request body
            content_length = int(self.headers.get("Content-Length", 0))
            if content_length == 0:
                self._send_error("Empty request body")
                return

            body = self.rfile.read(content_length).decode("utf-8")
            data = json.loads(body)

            # Validate required fields
            year_month = data.get("year_month")
            user_id = data.get("user_id")

            if not year_month:
                self._send_error("Missing required field: year_month")
                return

            if not user_id:
                self._send_error("Missing required field: user_id")
                return

            # Validate year_month format (YYYY-MM)
            if not year_month or len(year_month) != 7 or year_month[4] != "-":
                self._send_error("Invalid year_month format. Expected YYYY-MM")
                return

            # Run the workflow
            print(f"Running recommendation workflow for {year_month}, user: {user_id}")
            result = run_recommendation_workflow(year_month, user_id)

            # Send response
            self._send_json(result, 200 if result["success"] else 500)

        except json.JSONDecodeError:
            self._send_error("Invalid JSON in request body")
        except Exception as e:
            print(f"Error in recommendation API: {str(e)}")
            import traceback
            traceback.print_exc()
            self._send_error(f"Internal server error: {str(e)}", 500)

    def do_GET(self):
        """Handle GET request (not allowed)"""
        self._send_error("Method not allowed. Use POST.", 405)
