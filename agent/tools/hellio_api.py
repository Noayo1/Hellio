"""Tools for interacting with Hellio HR API."""
import requests
import base64
from strands import tool
from config import API_BASE_URL, API_EMAIL, API_PASSWORD

# Cache for auth token
_token_cache = {"token": None}


def get_auth_token() -> str:
    """Get or refresh auth token."""
    if _token_cache["token"]:
        return _token_cache["token"]

    response = requests.post(
        f"{API_BASE_URL}/api/auth/login",
        json={"email": API_EMAIL, "password": API_PASSWORD}
    )
    response.raise_for_status()
    _token_cache["token"] = response.json()["token"]
    return _token_cache["token"]


def auth_headers() -> dict:
    """Get authorization headers."""
    return {"Authorization": f"Bearer {get_auth_token()}"}


@tool
def ingest_cv(file_path: str, filename: str) -> dict:
    """
    Upload and process a CV document through the Hellio ingestion pipeline.

    Args:
        file_path: Path to the CV file on disk (from download_attachment)
        filename: Original filename with extension

    Returns:
        dict with candidateId, candidateName, status, and candidateSummary
    """
    with open(file_path, "rb") as f:
        file_content = f.read()

    response = requests.post(
        f"{API_BASE_URL}/api/ingestion/upload",
        params={"type": "cv"},
        files={"file": (filename, file_content)},
        headers=auth_headers()
    )
    return response.json()


@tool
def ingest_job(file_path: str, filename: str) -> dict:
    """
    Upload and process a job posting document through the Hellio ingestion pipeline.

    Args:
        file_path: Path to the job posting file on disk
        filename: Original filename with extension

    Returns:
        dict with positionId, status, and positionSummary
    """
    with open(file_path, "rb") as f:
        file_content = f.read()

    response = requests.post(
        f"{API_BASE_URL}/api/ingestion/upload",
        params={"type": "job"},
        files={"file": (filename, file_content)},
        headers=auth_headers()
    )
    return response.json()


@tool
def save_email_as_text(email_body: str, filename: str, save_path: str = "/tmp") -> str:
    """
    Save email body text to a file for ingestion (used for job postings in email body).

    Args:
        email_body: The email body text content
        filename: Filename to save as (e.g., 'job_posting.txt')
        save_path: Directory to save the file (default: /tmp)

    Returns:
        Full path to the saved file
    """
    import os
    file_path = os.path.join(save_path, filename)
    with open(file_path, "w") as f:
        f.write(email_body)
    return file_path


@tool
def create_notification(
    notification_type: str,
    summary: str,
    action_url: str = None,
    candidate_id: str = None,
    position_id: str = None,
    draft_id: str = None,
    metadata: dict = None
) -> dict:
    """
    Create a notification for human review.

    Args:
        notification_type: Type of notification (new_candidate, new_position, missing_info, error)
        summary: Human-readable summary of what happened
        action_url: URL to review in UI (e.g., /candidates/cand_123)
        candidate_id: Related candidate ID if applicable
        position_id: Related position ID if applicable
        draft_id: Gmail draft ID if a draft was created
        metadata: Additional context (match scores, missing fields, etc.)

    Returns:
        Created notification record
    """
    response = requests.post(
        f"{API_BASE_URL}/api/agent/notifications",
        json={
            "type": notification_type,
            "summary": summary,
            "actionUrl": action_url,
            "candidateId": candidate_id,
            "positionId": position_id,
            "draftId": draft_id,
            "metadata": metadata
        },
        headers=auth_headers()
    )
    return response.json()


@tool
def mark_email_processed(
    email_id: str,
    email_type: str = "other",
    action_taken: str = "processed",
    summary: str = "Email processed by agent",
    candidate_id: str = None,
    position_id: str = None,
    draft_id: str = None
) -> dict:
    """
    Mark an email as processed to avoid reprocessing.

    Args:
        email_id: Gmail message ID (REQUIRED)
        email_type: Type of email - 'candidate', 'position', or 'other' (default: 'other')
        action_taken: What action was taken - 'ingested', 'draft_created', 'skipped' (default: 'processed')
        summary: Brief description of what was done (default: 'Email processed by agent')
        candidate_id: Created/updated candidate ID if applicable
        position_id: Created position ID if applicable
        draft_id: Gmail draft ID if created

    Returns:
        Processed email record
    """
    response = requests.post(
        f"{API_BASE_URL}/api/agent/processed-emails",
        json={
            "emailId": email_id,
            "emailType": email_type,
            "actionTaken": action_taken,
            "summary": summary,
            "candidateId": candidate_id,
            "positionId": position_id,
            "draftId": draft_id
        },
        headers=auth_headers()
    )
    return response.json()


@tool
def check_email_processed(email_id: str) -> dict:
    """
    Check if an email has already been processed.

    Args:
        email_id: Gmail message ID

    Returns:
        Processed email record if found, or {"found": false}
    """
    response = requests.get(
        f"{API_BASE_URL}/api/agent/processed-emails/{email_id}",
        headers=auth_headers()
    )
    if response.status_code == 404:
        return {"found": False}
    return {"found": True, **response.json()}


@tool
def get_positions() -> list:
    """
    Get all open positions from the system.

    Returns:
        List of position objects with title, company, skills, requirements
    """
    response = requests.get(
        f"{API_BASE_URL}/api/positions",
        headers=auth_headers()
    )
    return response.json()


@tool
def get_candidates() -> list:
    """
    Get all candidates from the system.

    Returns:
        List of candidate objects with name, email, skills, experience
    """
    response = requests.get(
        f"{API_BASE_URL}/api/candidates",
        headers=auth_headers()
    )
    return response.json()


@tool
def suggest_candidates_for_position(position_id: str) -> list:
    """
    Get semantically similar candidates for a position using embeddings.

    Args:
        position_id: The position ID to find candidates for

    Returns:
        List of up to 3 matching candidates with similarity scores
    """
    response = requests.get(
        f"{API_BASE_URL}/api/embeddings/positions/{position_id}/suggest-candidates",
        headers=auth_headers()
    )
    if response.status_code != 200:
        return []
    return response.json()


@tool
def get_candidate_details(candidate_id: str) -> dict:
    """
    Get full details of a specific candidate.

    Args:
        candidate_id: The candidate ID

    Returns:
        Full candidate object with all details
    """
    response = requests.get(
        f"{API_BASE_URL}/api/candidates/{candidate_id}",
        headers=auth_headers()
    )
    if response.status_code == 404:
        return {"error": "Candidate not found"}
    return response.json()


@tool
def get_position_details(position_id: str) -> dict:
    """
    Get full details of a specific position.

    Args:
        position_id: The position ID

    Returns:
        Full position object with all details
    """
    response = requests.get(
        f"{API_BASE_URL}/api/positions/{position_id}",
        headers=auth_headers()
    )
    if response.status_code == 404:
        return {"error": "Position not found"}
    return response.json()
