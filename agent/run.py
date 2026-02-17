#!/usr/bin/env python3
"""HR Email Agent runner with polling loop."""
import time
import signal
import sys
from datetime import datetime

from config import POLL_INTERVAL, GMAIL_CANDIDATES_ADDRESS, GMAIL_POSITIONS_ADDRESS
from hr_agent import create_agent

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

        try:
            # Instruct the agent to check for new emails
            prompt = f"""
Check for new unread emails that need processing.

1. Search for unread emails sent to either:
   - {GMAIL_CANDIDATES_ADDRESS} (candidate applications)
   - {GMAIL_POSITIONS_ADDRESS} (job postings)

2. For each email found:
   - First check if it was already processed using check_email_processed
   - If not processed, handle it according to the appropriate workflow
   - Mark it as processed when done

3. Summarize what you did (or say "No new emails to process" if inbox is clear)

Be efficient - if there are no new emails, just report that and finish.
"""
            result = agent(prompt)
            print(f"   Result: {result}")

        except Exception as e:
            print(f"   Error in polling cycle: {e}")

        if running:
            print(f"   Sleeping for {POLL_INTERVAL} seconds...")
            # Sleep in small increments to allow graceful shutdown
            for _ in range(POLL_INTERVAL):
                if not running:
                    break
                time.sleep(1)

    print()
    print("HR Email Agent stopped.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
