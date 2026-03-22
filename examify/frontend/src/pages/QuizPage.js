/**
 * Examify Quiz Page
 * Interactive quiz mode with timer, scoring, and answer submission.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Clock, Shuffle, ChevronLeft, ChevronRight, Send, AlertCircle, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import QuestionCard from '../components/QuestionCard';
import { getQuestionSet, getAllQuestions, createSession, submitAnswers } from '../utils/api';
import { useTimer } from '../hooks/useExamify';

export default function QuizPage() {
  const { setId } = useParams();
  const navigate = useNavigate();

  const [questionSet, setQuestionSet] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [answers, setAnswers] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [quizStarted, setQuizStarted] = useState(false);
  const [shuffled, setShuffled] = useState(false);
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(60);

  const timer = useTimer(0);
  const countdownTimer = useTimer(timeLimitMinutes * 60, true);

  useEffect(() => {
    const load = async () => {
      try {
        const [setRes, qRes] = await Promise.all([
          getQuestionSet(parseInt(setId)),
          getAllQuestions(parseInt(setId), true),
        ]);
        setQuestionSet(setRes.question_set);
        setQuestions(qRes.questions);
      } catch (err) {
        toast.error('Failed to load quiz');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [setId]);

  const handleStart = async () => {
    try {
      const sessRes = await createSession(parseInt(setId));
      setSessionId(sessRes.session.id);

      let qs = [...questions];
      if (shuffled) {
        for (let i = qs.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [qs[i], qs[j]] = [qs[j], qs[i]];
        }
        setQuestions(qs);
      }

      setQuizStarted(true);
      timer.start();
      if (timerEnabled) {
        countdownTimer.reset(timeLimitMinutes * 60);
        countdownTimer.start();
      }
    } catch (err) {
      toast.error('Failed to start quiz');
    }
  };

  const handleAnswer = useCallback((questionId, answer) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  }, []);

  const handleSubmit = async () => {
    const unanswered = questions.filter(q => !answers[q.id]);
    if (unanswered.length > 0) {
      if (!window.confirm(`You have ${unanswered.length} unanswered questions. Submit anyway?`)) return;
    }

    setSubmitting(true);
    timer.stop();
    countdownTimer.stop();

    try {
      const res = await submitAnswers(sessionId, answers, timer.seconds);
      toast.success(`Quiz submitted! Score: ${res.score.toFixed(1)}%`);
      navigate(`/results/${sessionId}`, { state: { results: res } });
    } catch (err) {
      toast.error(err.message || 'Submission failed');
      setSubmitting(false);
    }
  };

  const answeredCount = Object.keys(answers).length;
  const progress = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

  if (loading) {
    return (
      <div className="page-container">
        <div style={{ textAlign: 'center', padding: '5rem' }}>
          <div className="spinner spinner-lg" style={{ margin: '0 auto 1rem' }} />
          <p className="text-muted">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (!questions.length) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <AlertCircle size={40} className="empty-state-icon" />
          <h3 style={{ marginBottom: '0.5rem' }}>No Questions Available</h3>
          <p className="text-muted text-sm">This question set has no questions yet.</p>
          <Link to="/" className="btn btn-primary btn-sm" style={{ marginTop: '1rem' }}>Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  // Pre-quiz setup screen
  if (!quizStarted) {
    return (
      <div className="page-container">
        <div className="page-header">
          <Link to={`/questions/${setId}`} className="btn btn-ghost btn-sm" style={{ marginBottom: '0.75rem', paddingLeft: 0 }}>
            ← Back to Questions
          </Link>
          <div className="page-header-meta">Quiz Mode</div>
          <h1>{questionSet?.title}</h1>
        </div>

        <div style={{ maxWidth: 600 }}>
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: '1.25rem' }}>Quiz Settings</h3>

            <div style={{ marginBottom: '1.5rem' }}>
              <div className="flex items-center justify-between" style={{ padding: '0.85rem 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <p style={{ fontWeight: 500, fontSize: '0.92rem' }}>Total Questions</p>
                  <p className="text-xs text-muted">MCQ + Fill-in-the-Blank</p>
                </div>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-gold)' }}>
                  {questions.length}
                </span>
              </div>

              <div className="flex items-center justify-between" style={{ padding: '0.85rem 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <p style={{ fontWeight: 500, fontSize: '0.92rem' }}>Shuffle Questions</p>
                  <p className="text-xs text-muted">Randomize question order</p>
                </div>
                <button
                  className={`btn btn-sm ${shuffled ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setShuffled(s => !s)}
                >
                  <Shuffle size={13} />
                  {shuffled ? 'On' : 'Off'}
                </button>
              </div>

              <div className="flex items-center justify-between" style={{ padding: '0.85rem 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <p style={{ fontWeight: 500, fontSize: '0.92rem' }}>Timer Mode</p>
                  <p className="text-xs text-muted">Set a time limit</p>
                </div>
                <button
                  className={`btn btn-sm ${timerEnabled ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setTimerEnabled(t => !t)}
                >
                  <Clock size={13} />
                  {timerEnabled ? 'On' : 'Off'}
                </button>
              </div>

              {timerEnabled && (
                <div className="flex items-center justify-between" style={{ padding: '0.85rem 0' }}>
                  <p style={{ fontWeight: 500, fontSize: '0.92rem' }}>Time Limit (minutes)</p>
                  <input
                    type="number"
                    className="form-input"
                    value={timeLimitMinutes}
                    min={5} max={180}
                    onChange={e => setTimeLimitMinutes(parseInt(e.target.value) || 60)}
                    style={{ width: 80, textAlign: 'center' }}
                  />
                </div>
              )}
            </div>

            <button className="btn btn-primary w-full" onClick={handleStart} style={{ justifyContent: 'center' }}>
              <BookOpen size={16} />
              Start Quiz
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="badge badge-mcq">{questionSet?.mcq_count} MCQ</span>
            <span className="badge badge-fitb">{questionSet?.fitb_count} Fill-in</span>
            <span className="text-xs text-muted">1 point per question</span>
          </div>
        </div>
      </div>
    );
  }

  // Active quiz
  const currentQuestion = questions[currentIndex];

  return (
    <div className="page-container">
      {/* Quiz header */}
      <div style={{
        position: 'sticky', top: 60, zIndex: 40,
        background: 'var(--bg-primary)',
        paddingBottom: '1rem',
        marginBottom: '1rem',
        borderBottom: '1px solid var(--border)',
      }}>
        <div className="flex items-center justify-between" style={{ marginBottom: '0.75rem' }}>
          <div className="flex items-center gap-3">
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
              Q {currentIndex + 1} / {questions.length}
            </span>
            <span className="text-xs text-muted">{answeredCount} answered</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1" style={{ color: timerEnabled && countdownTimer.seconds < 300 ? 'var(--accent-red)' : 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '0.88rem' }}>
              <Clock size={14} />
              {timerEnabled ? countdownTimer.formatted : timer.formatted}
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleSubmit}
              disabled={submitting}
            >
              <Send size={13} />
              {submitting ? 'Submitting...' : 'Submit Quiz'}
            </button>
          </div>
        </div>

        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Current question */}
      <QuestionCard
        question={currentQuestion}
        index={currentIndex}
        quizMode={true}
        selectedAnswer={answers[currentQuestion?.id] || null}
        onAnswer={handleAnswer}
      />

      {/* Navigation */}
      <div className="flex items-center justify-between" style={{ marginTop: '1.5rem' }}>
        <button
          className="btn btn-secondary"
          onClick={() => setCurrentIndex(i => i - 1)}
          disabled={currentIndex === 0}
        >
          <ChevronLeft size={16} /> Previous
        </button>

        {/* Question dots */}
        <div className="flex items-center gap-1" style={{ flexWrap: 'wrap', maxWidth: 400, justifyContent: 'center' }}>
          {questions.map((q, i) => (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(i)}
              style={{
                width: 10, height: 10,
                borderRadius: '50%',
                background: i === currentIndex ? 'var(--accent-gold)'
                  : answers[q.id] ? 'var(--accent-green)' : 'var(--border-strong)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 150ms',
              }}
              title={`Question ${i + 1}${answers[q.id] ? ' (answered)' : ''}`}
            />
          ))}
        </div>

        <button
          className="btn btn-secondary"
          onClick={() => setCurrentIndex(i => i + 1)}
          disabled={currentIndex === questions.length - 1}
        >
          Next <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
