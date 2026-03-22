"""
Examify Unit Tests
Tests for file upload, text extraction, and question generation logic.
"""

import os
import sys
import json
import unittest
import tempfile
import io

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db


class TestConfig:
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = 'test-secret-key'
    UPLOAD_FOLDER = tempfile.mkdtemp()
    MAX_CONTENT_LENGTH = 50 * 1024 * 1024


class TestFileUpload(unittest.TestCase):
    """Tests for file upload endpoint."""
    
    def setUp(self):
        self.app = create_app()
        self.app.config.from_object(TestConfig)
        self.client = self.app.test_client()
        
        with self.app.app_context():
            db.create_all()
    
    def tearDown(self):
        with self.app.app_context():
            db.drop_all()
    
    def test_upload_no_file(self):
        """Should return 400 when no file provided."""
        response = self.client.post('/api/upload')
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertIn('error', data)
    
    def test_upload_invalid_extension(self):
        """Should reject files with invalid extensions."""
        data = {
            'file': (io.BytesIO(b'test content'), 'malicious.exe')
        }
        response = self.client.post('/api/upload', data=data, content_type='multipart/form-data')
        self.assertEqual(response.status_code, 400)
        resp_data = json.loads(response.data)
        self.assertIn('error', resp_data)
    
    def test_upload_empty_file(self):
        """Should reject empty files."""
        data = {
            'file': (io.BytesIO(b''), 'empty.pdf')
        }
        response = self.client.post('/api/upload', data=data, content_type='multipart/form-data')
        self.assertEqual(response.status_code, 400)
    
    def test_health_endpoint(self):
        """Health check should return 200."""
        response = self.client.get('/api/health')
        self.assertEqual(response.status_code, 200)
    
    def test_list_files_empty(self):
        """File list should return empty array initially."""
        response = self.client.get('/api/files')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['files'], [])


class TestTextExtraction(unittest.TestCase):
    """Tests for text extraction utilities."""
    
    def test_clean_text_removes_page_numbers(self):
        """Page numbers should be removed."""
        from utils.text_extractor import clean_text
        text = "Important content here.\n123\nMore content."
        result = clean_text(text)
        self.assertNotIn('\n123\n', result)
    
    def test_clean_text_removes_urls(self):
        """URLs should be removed."""
        from utils.text_extractor import clean_text
        text = "Visit https://example.com for more information about the topic."
        result = clean_text(text)
        self.assertNotIn('https://example.com', result)
    
    def test_split_into_chunks_small_text(self):
        """Small text should return a single chunk."""
        from utils.text_extractor import split_into_chunks
        small_text = "This is a small piece of text."
        chunks = split_into_chunks(small_text, max_chunk_size=3000)
        self.assertEqual(len(chunks), 1)
    
    def test_split_into_chunks_large_text(self):
        """Large text should be split into multiple chunks."""
        from utils.text_extractor import split_into_chunks
        large_text = "[Section 1]\n" + "Word " * 1000 + "\n\n[Section 2]\n" + "Word " * 1000
        chunks = split_into_chunks(large_text, max_chunk_size=1000)
        self.assertGreater(len(chunks), 1)
    
    def test_clean_text_handles_empty_string(self):
        """Empty string should return empty string."""
        from utils.text_extractor import clean_text
        self.assertEqual(clean_text(''), '')
    
    def test_clean_text_normalizes_whitespace(self):
        """Multiple spaces and newlines should be normalized."""
        from utils.text_extractor import clean_text
        text = "Word1   Word2\n\n\n\nWord3  Word4"
        result = clean_text(text)
        self.assertNotIn('   ', result)


class TestFileValidation(unittest.TestCase):
    """Tests for file validation utilities."""
    
    def test_allowed_extension_pdf(self):
        """PDF extension should be allowed."""
        from utils.file_validator import is_allowed_extension
        self.assertTrue(is_allowed_extension('lecture.pdf'))
    
    def test_allowed_extension_pptx(self):
        """PPTX extension should be allowed."""
        from utils.file_validator import is_allowed_extension
        self.assertTrue(is_allowed_extension('slides.pptx'))
    
    def test_disallowed_extension_exe(self):
        """EXE extension should be rejected."""
        from utils.file_validator import is_allowed_extension
        self.assertFalse(is_allowed_extension('malware.exe'))
    
    def test_sanitize_filename_removes_path(self):
        """Path traversal attempts should be sanitized."""
        from utils.file_validator import sanitize_filename
        result = sanitize_filename('../../../etc/passwd.pdf')
        self.assertNotIn('..', result)
        self.assertNotIn('/', result)
    
    def test_sanitize_filename_preserves_extension(self):
        """Extension should be preserved after sanitization."""
        from utils.file_validator import sanitize_filename
        result = sanitize_filename('my lecture notes.pdf')
        self.assertTrue(result.endswith('.pdf'))


class TestQuestionSetAPI(unittest.TestCase):
    """Tests for question set endpoints."""
    
    def setUp(self):
        self.app = create_app()
        self.app.config.from_object(TestConfig)
        self.client = self.app.test_client()
        with self.app.app_context():
            db.create_all()
    
    def tearDown(self):
        with self.app.app_context():
            db.drop_all()
    
    def test_list_question_sets_empty(self):
        """Should return empty list initially."""
        response = self.client.get('/api/question-sets')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['question_sets'], [])
    
    def test_generate_questions_missing_file_id(self):
        """Should return 400 when file_id missing."""
        response = self.client.post(
            '/api/generate-questions',
            json={},
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)
    
    def test_generate_questions_nonexistent_file(self):
        """Should return 404 for nonexistent file."""
        response = self.client.post(
            '/api/generate-questions',
            json={'file_id': 9999},
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 404)


if __name__ == '__main__':
    unittest.main(verbosity=2)
