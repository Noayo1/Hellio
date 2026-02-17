"""Configuration for HR Email Agent."""
import os

# Hellio API configuration
API_BASE_URL = os.getenv("HELLIO_API_URL", "http://localhost:3000")
API_EMAIL = os.getenv("HELLIO_API_EMAIL", "admin@hellio.com")
API_PASSWORD = os.getenv("HELLIO_API_PASSWORD", os.getenv("ADMIN_PASSWORD", ""))

# Gmail configuration
GMAIL_CANDIDATES_ADDRESS = os.getenv("GMAIL_CANDIDATES", "nyo1254+candidates@gmail.com")
GMAIL_POSITIONS_ADDRESS = os.getenv("GMAIL_POSITIONS", "nyo1254+positions@gmail.com")

# Agent configuration
POLL_INTERVAL = int(os.getenv("POLL_INTERVAL", "30"))
MAX_EMAILS_PER_CYCLE = int(os.getenv("MAX_EMAILS_PER_CYCLE", "10"))
