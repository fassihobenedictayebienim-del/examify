"""
Examify Upload Routes
Supports uploading MULTIPLE files at once.
"""

import os
import uuid
import threading
import logging
from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename

from models.models import db, UploadedFile
from utils.text_extractor import extract_text
from utils.file_validator import validate_upload, sanitize_filename, get_file_extension

logger = logging.getLogger(__name__)
upload_bp = Blueprint('upload', __name__)


def process_file_async(app, file_id, filepath, file_type):
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
                uploaded_file.error_message = 'Could not extract meaningful text from file.'
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


def save_and_process(app, file, original_name):
    """Save a single file and start async extraction. Returns UploadedFile dict."""
    safe_name = sanitize_filename(original_name)
    file_type = get_file_extension(safe_name)
    unique_name = f"{uuid.uuid4().hex}_{safe_name}"
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_name)

    file.save(filepath)
    file_size = os.path.getsize(filepath)

    uploaded_file = UploadedFile(
        filename=unique_name,
        original_filename=original_name,
        file_type=file_type,
        file_size=file_size,
        status='uploaded'
    )
    db.session.add(uploaded_file)
    db.session.commit()

    thread = threading.Thread(
        target=process_file_async,
        args=(app, uploaded_file.id, filepath, file_type),
        daemon=True
    )
    thread.start()

    return uploaded_file.to_dict()


@upload_bp.route('/upload', methods=['POST'])
def upload_file():
    """
    POST /api/upload
    Accepts one OR multiple files via the 'file' or 'files' field.
    Returns list of uploaded file records.
    """
    # Support both single ('file') and multiple ('files') field names
    files = request.files.getlist('files') or request.files.getlist('file')

    if not files or all(f.filename == '' for f in files):
        return jsonify({'error': 'No files provided'}), 400

    app = current_app._get_current_object()
    results = []
    errors = []

    for file in files:
        if not file.filename:
            continue

        is_valid, error_msg = validate_upload(file, file.filename)
        if not is_valid:
            errors.append({'filename': file.filename, 'error': error_msg})
            continue

        try:
            record = save_and_process(app, file, file.filename)
            results.append(record)
            logger.info(f"Uploaded: {file.filename}")
        except Exception as e:
            errors.append({'filename': file.filename, 'error': str(e)})

    if not results and errors:
        return jsonify({'error': errors[0]['error'], 'errors': errors}), 400

    return jsonify({
        'message': f'{len(results)} file(s) uploaded successfully.',
        'files': results,
        'errors': errors
    }), 201


@upload_bp.route('/files', methods=['GET'])
def list_files():
    files = UploadedFile.query.order_by(UploadedFile.upload_date.desc()).all()
    return jsonify({'files': [f.to_dict() for f in files]})


@upload_bp.route('/files/<int:file_id>', methods=['GET'])
def get_file(file_id):
    uploaded_file = UploadedFile.query.get_or_404(file_id)
    return jsonify({'file': uploaded_file.to_dict()})


@upload_bp.route('/files/<int:file_id>/status', methods=['GET'])
def get_file_status(file_id):
    uploaded_file = UploadedFile.query.get_or_404(file_id)
    return jsonify({
        'id': uploaded_file.id,
        'status': uploaded_file.status,
        'error_message': uploaded_file.error_message,
        'has_text': bool(uploaded_file.text_content and len(uploaded_file.text_content) > 100)
    })


@upload_bp.route('/files/<int:file_id>', methods=['DELETE'])
def delete_file(file_id):
    uploaded_file = UploadedFile.query.get_or_404(file_id)
    filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], uploaded_file.filename)
    if os.path.exists(filepath):
        os.remove(filepath)
    db.session.delete(uploaded_file)
    db.session.commit()
    return jsonify({'message': 'File deleted successfully'})
