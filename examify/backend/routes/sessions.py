"""
Examify Session Routes
"""

import json
import logging
from datetime import datetime
from flask import Blueprint, request, jsonify
from models.models import db, QuizSession, Question, QuestionSet

logger = logging.getLogger(__name__)
sessions_bp = Blueprint('sessions', __name__)


@sessions_bp.route('/sessions', methods=['POST'])
def create_session():
    data = request.get_json()
    if not data or 'question_set_id' not in data:
        return jsonify({'error': 'question_set_id is required'}), 400

    qs_id = data['question_set_id']
    question_set = QuestionSet.query.get(qs_id)
    if not question_set:
        return jsonify({'error': 'Question set not found'}), 404

    session = QuizSession(question_set_id=qs_id)
    db.session.add(session)
    db.session.commit()

    return jsonify({'session': session.to_dict()}), 201


@sessions_bp.route('/submit-answers', methods=['POST'])
def submit_answers():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body required'}), 400

    session_id = data.get('session_id')
    user_answers = data.get('answers', {})
    time_taken = data.get('time_taken_seconds', 0)

    if not session_id:
        return jsonify({'error': 'session_id is required'}), 400

    session = QuizSession.query.get(session_id)
    if not session:
        return jsonify({'error': 'Session not found'}), 404

    if session.completed_at:
        return jsonify({'error': 'Session already submitted'}), 400

    question_ids = [int(qid) for qid in user_answers.keys()]
    questions = Question.query.filter(Question.id.in_(question_ids)).all()
    questions_by_id = {q.id: q for q in questions}

    results = []
    correct_count = 0

    for q_id_str, user_answer in user_answers.items():
        q_id = int(q_id_str)
        question = questions_by_id.get(q_id)
        if not question:
            continue

        is_correct = False
        if question.question_type == 'mcq':
            is_correct = user_answer.upper() == question.correct_answer.upper()
        elif question.question_type == 'fitb':
            is_correct = user_answer.strip().lower() == question.correct_answer.strip().lower()

        if is_correct:
            correct_count += 1

        result = {
            'question_id': q_id,
            'question_text': question.question_text,
            'question_type': question.question_type,
            'user_answer': user_answer,
            'correct_answer': question.correct_answer,
            'is_correct': is_correct,
            'explanation': question.explanation,
            'topic': question.topic,
            'difficulty': question.difficulty,
        }

        if question.question_type == 'mcq':
            result['options'] = {
                'A': question.option_a,
                'B': question.option_b,
                'C': question.option_c,
                'D': question.option_d,
            }

        results.append(result)

    total_answered = len(results)
    score = (correct_count / total_answered * 100) if total_answered > 0 else 0

    session.completed_at = datetime.utcnow()
    session.score = round(score, 2)
    session.total_answered = total_answered
    session.correct_count = correct_count
    session.time_taken_seconds = time_taken
    session.answers_json = json.dumps(user_answers)
    db.session.commit()

    by_difficulty = {}
    by_topic = {}

    for r in results:
        diff = r['difficulty'] or 'Unknown'
        topic = r['topic'] or 'General'

        if diff not in by_difficulty:
            by_difficulty[diff] = {'correct': 0, 'total': 0}
        by_difficulty[diff]['total'] += 1
        if r['is_correct']:
            by_difficulty[diff]['correct'] += 1

        if topic not in by_topic:
            by_topic[topic] = {'correct': 0, 'total': 0}
        by_topic[topic]['total'] += 1
        if r['is_correct']:
            by_topic[topic]['correct'] += 1

    return jsonify({
        'session_id': session_id,
        'score': round(score, 2),
        'correct_count': correct_count,
        'total_answered': total_answered,
        'time_taken_seconds': time_taken,
        'results': results,
        'breakdown': {
            'by_difficulty': by_difficulty,
            'by_topic': by_topic,
        }
    })


@sessions_bp.route('/sessions/<int:session_id>', methods=['GET'])
def get_session(session_id):
    session = QuizSession.query.get_or_404(session_id)
    return jsonify({'session': session.to_dict()})


@sessions_bp.route('/sessions', methods=['GET'])
def list_sessions():
    set_id = request.args.get('set_id', type=int)
    query = QuizSession.query
    if set_id:
        query = query.filter_by(question_set_id=set_id)
    sessions = query.order_by(QuizSession.started_at.desc()).limit(50).all()
    return jsonify({'sessions': [s.to_dict() for s in sessions]})