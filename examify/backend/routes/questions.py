"""
Examify Questions Routes
"""

import threading
import logging
from flask import Blueprint, request, jsonify, current_app

from models.models import db, UploadedFile, QuestionSet, Question
from utils.question_generator import generate_questions

logger = logging.getLogger(__name__)
questions_bp = Blueprint('questions', __name__)


def generate_questions_async(app, file_id, question_set_id, text, target_mcq, target_fitb):
    with app.app_context():
        question_set = QuestionSet.query.get(question_set_id)
        if not question_set:
            return
        try:
            questions_data = generate_questions(text, target_mcq, target_fitb)

            for q_data in questions_data:
                question = Question(
                    question_set_id=question_set_id,
                    question_text=q_data.get('question_text', ''),
                    question_type=q_data.get('question_type', 'mcq'),
                    option_a=q_data.get('option_a'),
                    option_b=q_data.get('option_b'),
                    option_c=q_data.get('option_c'),
                    option_d=q_data.get('option_d'),
                    correct_answer=q_data.get('correct_answer', ''),
                    topic=q_data.get('topic', 'General'),
                    difficulty=q_data.get('difficulty', 'Medium'),
                    explanation=q_data.get('explanation', ''),
                    order_index=q_data.get('order_index', 0),
                )
                db.session.add(question)

            mcq_count = sum(1 for q in questions_data if q.get('question_type') == 'mcq')
            fitb_count = sum(1 for q in questions_data if q.get('question_type') == 'fitb')

            question_set.total_questions = len(questions_data)
            question_set.mcq_count = mcq_count
            question_set.fitb_count = fitb_count

            uploaded_file = UploadedFile.query.get(file_id)
            if uploaded_file:
                uploaded_file.status = 'questions_ready'

            db.session.commit()
            logger.info(f"QuestionSet {question_set_id}: {mcq_count} MCQ + {fitb_count} FITB")

        except Exception as e:
            logger.error(f"Error generating questions: {e}")
            try:
                question_set.total_questions = -1
                db.session.commit()
            except Exception:
                pass


@questions_bp.route('/generate-questions', methods=['POST'])
def generate_questions_endpoint():
    data = request.get_json()
    if not data or 'file_id' not in data:
        return jsonify({'error': 'file_id is required'}), 400

    file_id = data['file_id']
    target_mcq = min(int(data.get('target_mcq', 70)), 150)
    target_fitb = min(int(data.get('target_fitb', 30)), 80)

    uploaded_file = UploadedFile.query.get(file_id)
    if not uploaded_file:
        return jsonify({'error': 'File not found'}), 404

    if uploaded_file.status not in ('ready', 'questions_ready'):
        return jsonify({'error': f'File not ready. Status: {uploaded_file.status}'}), 400

    if not uploaded_file.text_content:
        return jsonify({'error': 'No text content available'}), 400

    question_set = QuestionSet(
        file_id=file_id,
        title=f"Questions for {uploaded_file.original_filename}",
        total_questions=0
    )
    db.session.add(question_set)
    db.session.commit()

    app = current_app._get_current_object()
    thread = threading.Thread(
        target=generate_questions_async,
        args=(app, file_id, question_set.id, uploaded_file.text_content, target_mcq, target_fitb),
        daemon=True
    )
    thread.start()

    return jsonify({
        'message': 'Question generation started',
        'question_set': question_set.to_dict()
    }), 202


@questions_bp.route('/question-sets', methods=['GET'])
def list_question_sets():
    file_id = request.args.get('file_id', type=int)
    query = QuestionSet.query
    if file_id:
        query = query.filter_by(file_id=file_id)
    sets = query.order_by(QuestionSet.created_at.desc()).all()
    return jsonify({'question_sets': [s.to_dict() for s in sets]})


@questions_bp.route('/question-sets/<int:set_id>', methods=['GET'])
def get_question_set(set_id):
    question_set = QuestionSet.query.get_or_404(set_id)
    return jsonify({'question_set': question_set.to_dict()})


@questions_bp.route('/question-sets/<int:set_id>/status', methods=['GET'])
def get_question_set_status(set_id):
    question_set = QuestionSet.query.get_or_404(set_id)
    status = 'generating'
    if question_set.total_questions > 0:
        status = 'ready'
    elif question_set.total_questions == -1:
        status = 'error'
    return jsonify({
        'id': question_set.id,
        'status': status,
        'total_questions': question_set.total_questions,
        'mcq_count': question_set.mcq_count,
        'fitb_count': question_set.fitb_count,
    })


@questions_bp.route('/questions', methods=['GET'])
def get_questions():
    set_id = request.args.get('set_id', type=int)
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 20, type=int), 100)
    q_type = request.args.get('type')
    difficulty = request.args.get('difficulty')
    hide_answers = request.args.get('hide_answers', 'false').lower() == 'true'

    query = Question.query
    if set_id:
        query = query.filter_by(question_set_id=set_id)
    if q_type:
        query = query.filter_by(question_type=q_type)
    if difficulty:
        query = query.filter_by(difficulty=difficulty)

    query = query.order_by(Question.order_index)
    total = query.count()
    questions = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'questions': [q.to_dict(hide_answer=hide_answers) for q in questions.items],
        'pagination': {
            'page': page,
            'per_page': per_page,
            'total': total,
            'pages': questions.pages,
            'has_next': questions.has_next,
            'has_prev': questions.has_prev,
        }
    })


@questions_bp.route('/questions/all', methods=['GET'])
def get_all_questions():
    set_id = request.args.get('set_id', type=int)
    if not set_id:
        return jsonify({'error': 'set_id is required'}), 400

    hide_answers = request.args.get('hide_answers', 'true').lower() == 'true'
    questions = Question.query.filter_by(
        question_set_id=set_id
    ).order_by(Question.order_index).all()

    return jsonify({
        'questions': [q.to_dict(hide_answer=hide_answers) for q in questions],
        'total': len(questions)
    })


@questions_bp.route('/question-sets/<int:set_id>', methods=['DELETE'])
def delete_question_set(set_id):
    question_set = QuestionSet.query.get_or_404(set_id)
    db.session.delete(question_set)
    db.session.commit()
    return jsonify({'message': 'Question set deleted'})
