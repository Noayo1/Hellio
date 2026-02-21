#!/usr/bin/env python3
"""HR Email Agent runner with polling loop."""
import time
import signal
import sys
import requests
from datetime import datetime

from config import POLL_INTERVAL, GMAIL_CANDIDATES_ADDRESS, GMAIL_POSITIONS_ADDRESS, API_BASE_URL
from hr_agent import create_agent

# Recreate agent every N cycles to prevent context accumulation
RESET_INTERVAL = 50

# Flag for graceful shutdown
running = True


def signal_handler(signum, frame):
    """Handle shutdown signals gracefully."""
    global running
    print("\nShutdown requested, finishing current cycle...")
    running = False


def main():
    """Main polling loop."""
    global running

    # Register signal handlers for graceful shutdown
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    print("=" * 60)
    print("HR Email Agent Starting")
    print("=" * 60)
    print(f"Candidates address: {GMAIL_CANDIDATES_ADDRESS}")
    print(f"Positions address: {GMAIL_POSITIONS_ADDRESS}")
    print(f"Poll interval: {POLL_INTERVAL} seconds")
    print("=" * 60)

    # Create the agent
    print("Initializing agent...")
    agent = create_agent()
    print("Agent ready!")
    print()

    cycle = 0
    while running:
        cycle += 1
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] Polling cycle {cycle}")

        # Reset agent periodically to prevent context drift
        if cycle % RESET_INTERVAL == 0:
            print(f"   Resetting agent (every {RESET_INTERVAL} cycles)...")
            agent = create_agent()

        try:
            # Instruct the agent to find and process ONE email per cycle
            prompt = f"""
Check for new unread emails that need processing.

1. Search for unread emails sent to either:
   - {GMAIL_CANDIDATES_ADDRESS} (candidate applications)
   - {GMAIL_POSITIONS_ADDRESS} (job postings)

2. Find the FIRST unprocessed email:
   - Check each email with check_email_processed
   - Pick the first one that has NOT been processed yet

3. If you found an unprocessed email:
   - Process it according to the appropriate workflow
   - Mark it as processed when done
   - Then STOP - do not process any more emails this cycle

4. If all emails are already processed (or no emails found):
   - Say "No new emails to process" and STOP

IMPORTANT: Only process ONE email per cycle. After handling one email, stop immediately.
"""
            result = agent(prompt)
            result_text = str(result).lower()
            print(f"   Result: {result}")

            # If agent processed an email, immediately start next cycle
            has_work = "no new emails" not in result_text

        except Exception as e:
            print(f"   Error in polling cycle: {e}")
            has_work = False
            # Persist error to DB so it's visible in the dashboard
            try:
                from tools.hellio_api import get_auth_token
                token = get_auth_token()
                requests.post(
                    f"{API_BASE_URL}/api/agent/notifications",
                    json={
                        "type": "error",
                        "summary": f"Agent polling cycle {cycle} failed: {str(e)[:500]}",
                    },
                    headers={"Authorization": f"Bearer {token}"},
                    timeout=5,
                )
            except Exception as notify_err:
                print(f"   Failed to persist error notification: {notify_err}")

        if running and not has_work:
            print(f"   Sleeping for {POLL_INTERVAL} seconds...")
            # Sleep in small increments to allow graceful shutdown
            for _ in range(POLL_INTERVAL):
                if not running:
                    break
                time.sleep(1)
        elif running and has_work:
            print("   More emails may be waiting, starting next cycle immediately...")

    print()
    print("HR Email Agent stopped.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
