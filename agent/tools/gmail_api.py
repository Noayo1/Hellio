"""Gmail API tools for Strands agent."""
import os
import json
import base64
from pathlib import Path
from strands import tool
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

# Gmail credentials paths (used by gmail-mcp server)
GMAIL_MCP_DIR = Path(os.getenv("GMAIL_MCP_DIR", str(Path.home() / ".gmail-mcp")))
CREDENTIALS_PATH = GMAIL_MCP_DIR / "credentials.json"
OAUTH_KEYS_PATH = GMAIL_MCP_DIR / "gcp-oauth.keys.json"

# Cache for Gmail service
_service_cache = {"service": None}


def get_gmail_service(force_refresh: bool = False):
    """Get authenticated Gmail API service."""
    if _service_cache["service"] and not force_refresh:
        return _service_cache["service"]

    if not CREDENTIALS_PATH.exists():
        raise RuntimeError(f"Gmail credentials not found at {CREDENTIALS_PATH}")

    # Load token from credentials.json
    with open(CREDENTIALS_PATH) as f:
        token_data = json.load(f)

    # Load client credentials from gcp-oauth.keys.json
    client_id = None
    client_secret = None
    if OAUTH_KEYS_PATH.exists():
        with open(OAUTH_KEYS_PATH) as f:
            oauth_data = json.load(f)
            # Handle nested "installed" or "web" format, or top-level
            creds_section = oauth_data.get("installed") or oauth_data.get("web") or oauth_data
            client_id = creds_section.get("client_id")
            client_secret = creds_section.get("client_secret")

    # Build credentials object
    creds = Credentials(
        token=token_data.get("access_token") or token_data.get("token"),
        refresh_token=token_data.get("refresh_token"),
        token_uri="https://oauth2.googleapis.com/token",
        client_id=client_id,
        client_secret=client_secret,
        scopes=token_data.get("scopes") or ["https://www.googleapis.com/auth/gmail.modify"],
    )

    service = build("gmail", "v1", credentials=creds)
    _service_cache["service"] = service
    return service


@tool
def search_emails(query: str, max_results: int = 10) -> list:
    """
    Search for emails using Gmail search syntax.

    Args:
        query: Gmail search query (e.g., 'is:unread to:myemail+candidates@gmail.com')
        max_results: Maximum number of results to return

    Returns:
        List of email summaries with id, subject, from, date
    """
    service = get_gmail_service()
    results = service.users().messages().list(
        userId="me", q=query, maxResults=max_results
    ).execute()

    messages = results.get("messages", [])
    emails = []

    for msg in messages:
        msg_data = service.users().messages().get(
            userId="me", id=msg["id"], format="metadata",
            metadataHeaders=["Subject", "From", "Date", "To"]
        ).execute()

        headers = {h["name"]: h["value"] for h in msg_data.get("payload", {}).get("headers", [])}
        emails.append({
            "id": msg["id"],
            "subject": headers.get("Subject", ""),
            "from": headers.get("From", ""),
            "to": headers.get("To", ""),
            "date": headers.get("Date", ""),
        })

    return emails


@tool
def read_email(message_id: str) -> dict:
    """
    Read full email content including body and attachment info.

    Args:
        message_id: Gmail message ID

    Returns:
        Email with subject, from, to, date, body, and attachments list
    """
    service = get_gmail_service()
    msg = service.users().messages().get(userId="me", id=message_id, format="full").execute()

    headers = {h["name"]: h["value"] for h in msg.get("payload", {}).get("headers", [])}

    # Extract body
    body = ""
    attachments = []

    def extract_parts(payload):
        nonlocal body
        if "parts" in payload:
            for part in payload["parts"]:
                extract_parts(part)
        else:
            mime_type = payload.get("mimeType", "")
            if mime_type == "text/plain" and "data" in payload.get("body", {}):
                body = base64.urlsafe_b64decode(payload["body"]["data"]).decode("utf-8", errors="ignore")
            elif "filename" in payload and payload["filename"]:
                attachments.append({
                    "filename": payload["filename"],
                    "mimeType": mime_type,
                    "attachmentId": payload["body"].get("attachmentId", ""),
                    "size": payload["body"].get("size", 0),
                })

    extract_parts(msg.get("payload", {}))

    # If no plain text, try to get from body directly
    if not body and "data" in msg.get("payload", {}).get("body", {}):
        body = base64.urlsafe_b64decode(msg["payload"]["body"]["data"]).decode("utf-8", errors="ignore")

    return {
        "id": message_id,
        "subject": headers.get("Subject", ""),
        "from": headers.get("From", ""),
        "to": headers.get("To", ""),
        "date": headers.get("Date", ""),
        "body": body,
        "attachments": attachments,
    }


@tool
def download_attachment(message_id: str, attachment_id: str, filename: str, save_path: str = "/tmp") -> str:
    """
    Download an email attachment to disk.

    Args:
        message_id: Gmail message ID
        attachment_id: Attachment ID from read_email result
        filename: Original filename to save as
        save_path: Directory to save the file (default: /tmp)

    Returns:
        Full path to the saved file
    """
    service = get_gmail_service()
    attachment = service.users().messages().attachments().get(
        userId="me", messageId=message_id, id=attachment_id
    ).execute()

    data = attachment.get("data", "")
    file_bytes = base64.urlsafe_b64decode(data)

    # Save to disk
    file_path = Path(save_path) / filename
    with open(file_path, "wb") as f:
        f.write(file_bytes)

    return str(file_path)


@tool
def create_draft(to: str, subject: str, body: str, reply_to_message_id: str = None) -> dict:
    """
    Create a draft email (never sends automatically).

    Args:
        to: Recipient email address
        subject: Email subject
        body: Email body text
        reply_to_message_id: Optional message ID to reply to

    Returns:
        Created draft info with id
    """
    import email.mime.text

    print(f"[create_draft] Creating draft to={to}, subject={subject[:50]}...")

    for attempt in range(2):
        try:
            service = get_gmail_service(force_refresh=(attempt > 0))

            message = email.mime.text.MIMEText(body)
            message["to"] = to
            message["subject"] = subject

            raw = base64.urlsafe_b64encode(message.as_bytes()).decode("utf-8")

            draft_body = {"message": {"raw": raw}}
            if reply_to_message_id:
                draft_body["message"]["threadId"] = reply_to_message_id

            draft = service.users().drafts().create(userId="me", body=draft_body).execute()

            print(f"[create_draft] SUCCESS: draft_id={draft['id']}")
            return {
                "id": draft["id"],
                "message_id": draft["message"]["id"],
            }
        except Exception as e:
            print(f"[create_draft] ERROR (attempt {attempt + 1}): {e}")
            if attempt == 0 and "SSL" in str(e):
                print("[create_draft] Retrying with fresh connection...")
                continue
            return {"error": str(e)}


@tool
def mark_email_as_read(message_id: str) -> dict:
    """
    Mark an email as read by removing UNREAD label.

    Args:
        message_id: Gmail message ID

    Returns:
        Updated message info
    """
    service = get_gmail_service()
    result = service.users().messages().modify(
        userId="me", id=message_id,
        body={"removeLabelIds": ["UNREAD"]}
    ).execute()

    return {"id": result["id"], "labels": result.get("labelIds", [])}
