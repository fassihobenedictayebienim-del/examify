"""
Examify Upload Routes
Handles file upload and text extraction endpoints.
"""

import os
import uuid
import threading
import logging
from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename

from models.models import db
from models import UploadedFile
from utils.text_extractor import extract_text
from utils.file_validator import validate_upload, sanitize_filename, get_file_extension

logger = logging.getLogger(__name__)
upload_bp = Blueprint('upload', __name__)


def process_file_async(app, file_id: int, filepath: str, file_type: str):
    """
    Background thread for text extraction.
    Updates the database when done.
    """
    with app.app_context():
        uploaded_file = UploadedFile.query.get(file_id)
        if not uploaded_file:
            return
        
        try:
            uploaded_file.status = 'processing'
            db.session.commit()
            
            text = extract_text(filepath, file_type)
            
            if not text or len(text.strip()) < 100:
                uploaded_file.status = 'error'
                uploaded_file.error_message = 'Could not extract meaningful text from file. Ensure the file has text content.'
            else:
                uploaded_file.text_content = text
                uploaded_file.status = 'ready'
                logger.info(f"File {file_id} processed: {len(text)} chars extracted")
            
            db.session.commit()
        
        except Exception as e:
            logger.error(f"Error processing file {file_id}: {e}")
            try:
                uploaded_file.status = 'error'
                uploaded_file.error_message = str(e)
                db.session.commit()
            except Exception:
                pass


@upload_bp.route('/upload', methods=['POST'])
def upload_file():
    """
    POST /api/upload
    Upload a lecture file (PDF, PPT, PPTX).
    Returns file metadata and starts async text extraction.
    """
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    
    if not file.filename:
        return jsonify({'error': 'No file selected'}), 400
    
    # Validate file
    is_valid, error_msg = validate_upload(file, file.filename)
    if not is_valid:
        return jsonify({'error': error_msg}), 400
    
    # Sanitize filename
    original_name = file.filename
    safe_name = sanitize_filename(original_name)
    file_type = get_file_extension(safe_name)
    
    # Generate unique filename to prevent conflicts
    unique_name = f"{uuid.uuid4().hex}_{safe_name}"
    filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], unique_name)
    
    # Save file
    file.save(filepath)
    file_size = os.path.getsize(filepath)
    
    # Create database record
    uploaded_file = UploadedFile(
        filename=unique_name,
        original_filename=original_name,
        file_type=file_type,
        file_size=file_size,
        status='uploaded'
    )
    db.session.add(uploaded_file)
    db.session.commit()
    
    # Start async extraction
    app = current_app._get_current_object()
    thread = threading.Thread(
        target=process_file_async,
        args=(app, uploaded_file.id, filepath, file_type),
        daemon=True
    )
    thread.start()
    
    logger.info(f"File uploaded: {original_name} -> {unique_name} ({file_size} bytes)")
    
    return jsonify({
        'message': 'File uploaded successfully. Text extraction started.',
        'file': uploaded_file.to_dict()
    }), 201


@upload_bp.route('/files', methods=['GET'])
def list_files():
    """
    GET /api/files
    Returns all uploaded files with their status.
    """
    files = UploadedFile.query.order_by(UploadedFile.upload_date.desc()).all()
    return jsonify({
        'files': [f.to_dict() for f in files]
    })


@upload_bp.route('/files/<int:file_id>', methods=['GET'])
def get_file(file_id):
    """
    GET /api/files/<id>
    Returns a specific file's metadata and status.
    """
    uploaded_file = UploadedFile.query.get_or_404(file_id)
    return jsonify({'file': uploaded_file.to_dict()})


@upload_bp.route('/files/<int:file_id>/status', methods=['GET'])
def get_file_status(file_id):
    """
    GET /api/files/<id>/status
    Poll for file processing status (for async UI updates).
    """
    uploaded_file = UploadedFile.query.get_or_404(file_id)
    return jsonify({
        'id': uploaded_file.id,
        'status': uploaded_file.status,
        'error_message': uploaded_file.error_message,
        'has_text': bool(uploaded_file.text_content and len(uploaded_file.text_content) > 100)
    })


@upload_bp.route('/files/<int:file_id>', methods=['DELETE'])
def delete_file(file_id):
    """
    DELETE /api/files/<id>
    Delete a file and all its associated questions.
    """
    uploaded_file = UploadedFile.query.get_or_404(file_id)
    
    # Delete physical file
    filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], uploaded_file.filename)
    if os.path.exists(filepath):
        os.remove(filepath)
    
    db.session.delete(uploaded_file)
    db.session.commit()
    
    return jsonify({'message': 'File and associated data deleted successfully'})
