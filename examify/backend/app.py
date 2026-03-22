"""
Examify Backend - Flask Application
API routes under /api/
Frontend served from /app/ with redirect from /
"""

import os
from flask import Flask, send_from_directory, jsonify, redirect
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

FRONTEND_BUILD_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), '..', 'frontend', 'build')
)


def create_app():
    app = Flask(__name__)

    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'examify-dev-secret-key')
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///examify.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024
    app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(__file__), 'uploads')

    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

    from models.models import db
    db.init_app(app)

    CORS(app, resources={r'/api/*': {'origins': '*'}})

    # ── Register API blueprints FIRST ─────────────────────────────────────────
    from routes.upload import upload_bp
    from routes.questions import questions_bp
    from routes.sessions import sessions_bp

    app.register_blueprint(upload_bp,    url_prefix='/api')
    app.register_blueprint(questions_bp, url_prefix='/api')
    app.register_blueprint(sessions_bp,  url_prefix='/api')

    with app.app_context():
        db.create_all()

    # ── API health ────────────────────────────────────────────────────────────
    @app.route('/api/health')
    def health():
        return jsonify(status='ok', message='Examify API is running')

    # ── Frontend static files served under /static/ ───────────────────────────
    # React build puts JS/CSS in build/static/
    # We serve them at /static/ which does NOT conflict with /api/
    @app.route('/static/js/<path:filename>')
    def static_js(filename):
        return send_from_directory(
            os.path.join(FRONTEND_BUILD_DIR, 'static', 'js'), filename)

    @app.route('/static/css/<path:filename>')
    def static_css(filename):
        return send_from_directory(
            os.path.join(FRONTEND_BUILD_DIR, 'static', 'css'), filename)

    @app.route('/static/media/<path:filename>')
    def static_media(filename):
        return send_from_directory(
            os.path.join(FRONTEND_BUILD_DIR, 'static', 'media'), filename)

    # ── Root-level static files (favicon, manifest, etc.) ────────────────────
    @app.route('/favicon.ico')
    def favicon():
        return send_from_directory(FRONTEND_BUILD_DIR, 'favicon.ico')

    @app.route('/manifest.json')
    def manifest():
        return send_from_directory(FRONTEND_BUILD_DIR, 'manifest.json')

    @app.route('/robots.txt')
    def robots():
        return send_from_directory(FRONTEND_BUILD_DIR, 'robots.txt')

    # ── All frontend app routes → index.html ─────────────────────────────────
    # List every React route explicitly so /api/ is NEVER touched here
    frontend_routes = [
        '/',
        '/upload',
        '/history',
        '/questions/<int:set_id>',
        '/quiz/<int:set_id>',
        '/results/<int:session_id>',
    ]

    def serve_index():
        index_path = os.path.join(FRONTEND_BUILD_DIR, 'index.html')
        if os.path.isfile(index_path):
            return send_from_directory(FRONTEND_BUILD_DIR, 'index.html')
        return jsonify(
            error='Frontend not built.',
            hint='Run: cd frontend && npm install && npm run build'
        ), 404

    @app.route('/')
    def index():
        return serve_index()

    @app.route('/upload')
    def upload_page():
        return serve_index()

    @app.route('/history')
    def history_page():
        return serve_index()

    @app.route('/questions/<int:set_id>')
    def questions_page(set_id):
        return serve_index()

    @app.route('/quiz/<int:set_id>')
    def quiz_page(set_id):
        return serve_index()

    @app.route('/results/<int:session_id>')
    def results_page(session_id):
        return serve_index()

    # ── Error handlers ────────────────────────────────────────────────────────
    @app.errorhandler(413)
    def file_too_large(e):
        return jsonify(error='File too large. Maximum size is 50 MB.'), 413

    @app.errorhandler(500)
    def server_error(e):
        return jsonify(error='Internal server error.'), 500

    return app


if __name__ == '__main__':
    application = create_app()
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    print(f'\n🎓  Examify running at http://localhost:{port}\n')
    application.run(host='0.0.0.0', port=port, debug=debug)
