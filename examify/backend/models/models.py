"""
Examify Database Models
"""

from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class UploadedFile(db.Model):
    __tablename__ = 'uploaded_files'

    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(255), nullable=False)
    original_filename = db.Column(db.String(255), nullable=False)
    file_type = db.Column(db.String(20), nullable=False)
    file_size = db.Column(db.Integer, nullable=False)
    upload_date = db.Column(db.DateTime, default=datetime.utcnow)
    text_content = db.Column(db.Text)
    status = db.Column(db.String(50), default='uploaded')
    error_message = db.Column(db.Text)

    question_sets = db.relationship('QuestionSet', backref='file', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'filename': self.filename,
            'original_filename': self.original_filename,
            'file_type': self.file_type,
            'file_size': self.file_size,
            'upload_date': self.upload_date.isoformat(),
            'status': self.status,
            'error_message': self.error_message,
            'question_sets_count': len(self.question_sets)
        }


class QuestionSet(db.Model):
    __tablename__ = 'question_sets'

    id = db.Column(db.Integer, primary_key=True)
    file_id = db.Column(db.Integer, db.ForeignKey('uploaded_files.id'), nullable=False)
    title = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    total_questions = db.Column(db.Integer, default=0)
    mcq_count = db.Column(db.Integer, default=0)
    fitb_count = db.Column(db.Integer, default=0)

    questions = db.relationship('Question', backref='question_set', lazy=True, cascade='all, delete-orphan')
    sessions = db.relationship('QuizSession', backref='question_set', lazy=True, cascade='all, delete-orphan')

    def to_dict(self, include_questions=False):
        result = {
            'id': self.id,
            'file_id': self.file_id,
            'title': self.title,
            'created_at': self.created_at.isoformat(),
            'total_questions': self.total_questions,
            'mcq_count': self.mcq_count,
            'fitb_count': self.fitb_count,
        }
        if include_questions:
            result['questions'] = [q.to_dict() for q in self.questions]
        return result


class Question(db.Model):
    __tablename__ = 'questions'

    id = db.Column(db.Integer, primary_key=True)
    question_set_id = db.Column(db.Integer, db.ForeignKey('question_sets.id'), nullable=False)
    question_text = db.Column(db.Text, nullable=False)
    question_type = db.Column(db.String(20), nullable=False)

    option_a = db.Column(db.Text)
    option_b = db.Column(db.Text)
    option_c = db.Column(db.Text)
    option_d = db.Column(db.Text)
    correct_answer = db.Column(db.String(10))

    topic = db.Column(db.String(255))
    difficulty = db.Column(db.String(20))
    explanation = db.Column(db.Text)
    order_index = db.Column(db.Integer, default=0)

    def to_dict(self, hide_answer=False):
        data = {
            'id': self.id,
            'question_set_id': self.question_set_id,
            'question_text': self.question_text,
            'question_type': self.question_type,
            'topic': self.topic,
            'difficulty': self.difficulty,
            'order_index': self.order_index,
        }
        if self.question_type == 'mcq':
            data['options'] = {
                'A': self.option_a,
                'B': self.option_b,
                'C': self.option_c,
                'D': self.option_d,
            }
        if not hide_answer:
            data['correct_answer'] = self.correct_answer
            data['explanation'] = self.explanation
        return data


class QuizSession(db.Model):
    __tablename__ = 'quiz_sessions'

    id = db.Column(db.Integer, primary_key=True)
    question_set_id = db.Column(db.Integer, db.ForeignKey('question_sets.id'), nullable=False)
    started_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime)
    score = db.Column(db.Float)
    total_answered = db.Column(db.Integer, default=0)
    correct_count = db.Column(db.Integer, default=0)
    time_taken_seconds = db.Column(db.Integer)
    answers_json = db.Column(db.Text)

    def to_dict(self):
        return {
            'id': self.id,
            'question_set_id': self.question_set_id,
            'started_at': self.started_at.isoformat(),
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'score': self.score,
            'total_answered': self.total_answered,
            'correct_count': self.correct_count,
            'time_taken_seconds': self.time_taken_seconds,
        }
