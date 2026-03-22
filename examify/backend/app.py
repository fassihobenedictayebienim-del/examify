"""
Examify Backend - Flask Application
Serves both the REST API and the built React frontend as static files.
"""

import os
from flask import Flask, send_from_directory, jsonify
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

    from routes.upload import upload_bp
    from routes.questions import questions_bp
    from routes.sessions import sessions_bp

    app.register_blueprint(upload_bp,    url_prefix='/api')
    app.register_blueprint(questions_bp, url_prefix='/api')
    app.register_blueprint(sessions_bp,  url_prefix='/api')

    with app.app_context():
        db.create_all()

    @app.route('/api/health')
    def health():
        return jsonify(status='ok', message='Examify API is running')

    @app.route('/')
    def index():
        index_path = os.path.join(FRONTEND_BUILD_DIR, 'index.html')
        if os.path.isfile(index_path):
            return send_from_directory(FRONTEND_BUILD_DIR, 'index.html')
        return jsonify(
            error='Frontend not built yet.',
            hint='Run: cd frontend && npm install && npm run build'
        ), 404

    @app.route('/static/<path:filename>')
    def static_assets(filename):
        return send_from_directory(
            os.path.join(FRONTEND_BUILD_DIR, 'static'), filename
        )

    @app.route('/<path:path>')
    def react_routes(path):
        full = os.path.join(FRONTEND_BUILD_DIR, path)
        if os.path.isfile(full):
            return send_from_directory(FRONTEND_BUILD_DIR, path)
        index_path = os.path.join(FRONTEND_BUILD_DIR, 'index.html')
        if os.path.isfile(index_path):
            return send_from_directory(FRONTEND_BUILD_DIR, 'index.html')
        return jsonify(error='Not found'), 404

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
