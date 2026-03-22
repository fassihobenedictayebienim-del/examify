"""
Examify File Security Utilities
Validates uploaded files to prevent injection attacks and ensure safety.
"""

import os
import re
import magic  # python-magic for MIME type detection
import logging
from werkzeug.utils import secure_filename

logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {'pdf', 'ppt', 'pptx'}
ALLOWED_MIME_TYPES = {
    'application/pdf',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
}
MAX_FILENAME_LENGTH = 255


def get_file_extension(filename: str) -> str:
    """Return lowercase file extension without dot."""
    return filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''


def is_allowed_extension(filename: str) -> bool:
    """Check if file has an allowed extension."""
    return get_file_extension(filename) in ALLOWED_EXTENSIONS


def is_allowed_mime_type(filepath: str) -> bool:
    """
    Verify the actual MIME type of the file (not just extension).
    Prevents extension spoofing attacks.
    """
    try:
        mime = magic.from_file(filepath, mime=True)
        return mime in ALLOWED_MIME_TYPES
    except Exception as e:
        logger.warning(f"Could not detect MIME type: {e}. Falling back to extension check.")
        return True  # Fallback: trust extension if magic fails


def sanitize_filename(filename: str) -> str:
    """
    Sanitize filename to prevent path traversal and injection attacks.
    """
    # Use werkzeug's secure_filename as base
    filename = secure_filename(filename)
    
    # Additional: remove any remaining path separators
    filename = re.sub(r'[/\\]', '_', filename)
    
    # Truncate if too long (preserve extension)
    if len(filename) > MAX_FILENAME_LENGTH:
        ext = get_file_extension(filename)
        base = filename[:MAX_FILENAME_LENGTH - len(ext) - 1]
        filename = f"{base}.{ext}"
    
    # Ensure filename is not empty after sanitization
    if not filename or filename.startswith('.'):
        filename = 'upload.' + get_file_extension(filename)
    
    return filename


def validate_upload(file, filename: str) -> tuple[bool, str]:
    """
    Full validation pipeline for uploaded files.
    Returns (is_valid, error_message).
    """
    # Check filename
    if not filename:
        return False, "No filename provided"
    
    # Check extension
    if not is_allowed_extension(filename):
        ext = get_file_extension(filename)
        return False, f"File type '.{ext}' not allowed. Accepted types: PDF, PPT, PPTX"
    
    # Check file size (handled by Flask MAX_CONTENT_LENGTH, but double-check)
    file.seek(0, 2)  # Seek to end
    size = file.tell()
    file.seek(0)  # Reset
    
    if size == 0:
        return False, "File is empty"
    
    if size > 50 * 1024 * 1024:  # 50MB
        return False, "File exceeds maximum size of 50MB"
    
    return True, ""


def validate_file_after_save(filepath: str) -> tuple[bool, str]:
    """
    Post-save MIME type validation.
    Call this after saving the file to disk.
    """
    if not os.path.exists(filepath):
        return False, "File was not saved correctly"
    
    if not is_allowed_mime_type(filepath):
        os.remove(filepath)  # Remove invalid file
        return False, "File content does not match the expected type"
    
    return True, ""
