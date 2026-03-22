import os
from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from dotenv import load_dotenv

load_dotenv()

FRONTEND_BUILD_DIR = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'build')


def create_app():
    app = Flask(
        __name__,
        static_folder=os.path.abspath(FRONTEND_BUILD_DIR),
        static_url_path='',
    )

    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'examify-dev-secret')
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

    app.register_blueprint(upload_bp, url_prefix='/api')
    app.register_blueprint(questions_bp, url_prefix='/api')
    app.register_blueprint(sessions_bp, url_prefix='/api')

    with app.app_context():
        db.create_all()

    @app.route('/api/health')
    def health():
        return jsonify(status='ok', message='Examify API is running')

    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_frontend(path):
        static_folder = app.static_folder

        if static_folder and path:
            full_path = os.path.join(static_folder, path)
            if os.path.isfile(full_path):
                return send_from_directory(static_folder, path)

        index = os.path.join(static_folder, 'index.html') if static_folder else None
        if index and os.path.isfile(index):
            return send_from_directory(static_folder, 'index.html')

        return jsonify(error='Frontend build not found.'), 404

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