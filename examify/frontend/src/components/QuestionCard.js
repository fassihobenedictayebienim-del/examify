/**
 * Examify QuestionCard Component
 * Renders a single MCQ or FITB question with optional answer reveal.
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

export default function QuestionCard({
  question,
  index,
  showAnswers = false,
  // Quiz mode props
  quizMode = false,
  selectedAnswer = null,
  onAnswer = null,
  // Results mode
  resultsMode = false,
  isCorrect = null,
  correctAnswer = null,
  userAnswer = null,
}) {
  const [localShowAnswer, setLocalShowAnswer] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const showAnswer = showAnswers || localShowAnswer;
  const isMCQ = question.question_type === 'mcq';
  const isFITB = question.question_type === 'fitb';

  const getDifficultyClass = (d) => {
    if (!d) return 'badge-neutral';
    return { Easy: 'badge-easy', Medium: 'badge-medium', Hard: 'badge-hard' }[d] || 'badge-neutral';
  };

  const getOptionStyle = (optKey) => {
    const base = {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
      padding: '0.75rem 1rem',
      borderRadius: 'var(--radius-md)',
      border: '1.5px solid var(--border)',
      marginBottom: '0.5rem',
      cursor: quizMode ? 'pointer' : 'default',
      transition: 'all 150ms',
      background: 'var(--bg-primary)',
    };

    if (quizMode && !resultsMode) {
      if (selectedAnswer === optKey) {
        return { ...base, borderColor: 'var(--accent-gold)', background: 'rgba(201,151,58,0.08)' };
      }
      return { ...base };
    }

    if (resultsMode) {
      const isThisCorrect = correctAnswer === optKey;
      const isThisSelected = userAnswer === optKey;
      if (isThisCorrect) {
        return { ...base, borderColor: 'var(--accent-green)', background: 'rgba(45,106,79,0.08)', cursor: 'default' };
      }
      if (isThisSelected && !isThisCorrect) {
        return { ...base, borderColor: 'var(--accent-red)', background: 'rgba(193,64,74,0.08)', cursor: 'default' };
      }
    }

    if (showAnswer && question.correct_answer === optKey) {
      return { ...base, borderColor: 'var(--accent-green)', background: 'rgba(45,106,79,0.06)', cursor: 'default' };
    }

    return base;
  };

  const getOptionLabelStyle = (optKey) => {
    const base = {
      width: 24, height: 24,
      borderRadius: '50%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '0.75rem', fontWeight: 700, flexShrink: 0,
      border: '1.5px solid var(--border)',
      background: 'var(--bg-secondary)',
      color: 'var(--text-secondary)',
    };

    if (quizMode && selectedAnswer === optKey && !resultsMode) {
      return { ...base, background: 'var(--accent-gold)', color: '#0f0d0a', border: 'none' };
    }
    if (resultsMode) {
      if (correctAnswer === optKey) return { ...base, background: 'var(--accent-green)', color: '#fff', border: 'none' };
      if (userAnswer === optKey && correctAnswer !== optKey) return { ...base, background: 'var(--accent-red)', color: '#fff', border: 'none' };
    }
    if (showAnswer && question.correct_answer === optKey) {
      return { ...base, background: 'var(--accent-green)', color: '#fff', border: 'none' };
    }
    return base;
  };

  return (
    <div
      className="card fade-in"
      style={{
        marginBottom: '1rem',
        borderLeft: resultsMode
          ? `3px solid ${isCorrect ? 'var(--accent-green)' : 'var(--accent-red)'}`
          : '3px solid transparent',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between" style={{ marginBottom: expanded ? '1rem' : 0 }}>
        <div className="flex items-center gap-3">
          <span
            style={{
              width: 28, height: 28, borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-secondary)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)',
              flexShrink: 0,
            }}
          >
            {index + 1}
          </span>

          <div className="flex items-center gap-2 flex-wrap">
            <span className={`badge ${isMCQ ? 'badge-mcq' : 'badge-fitb'}`}>
              {isMCQ ? 'MCQ' : 'Fill-in'}
            </span>
            {question.difficulty && (
              <span className={`badge ${getDifficultyClass(question.difficulty)}`}>
                {question.difficulty}
              </span>
            )}
            {question.topic && (
              <span className="badge badge-neutral">{question.topic}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!quizMode && !resultsMode && (
            <button
              className="btn btn-icon btn-ghost btn-sm"
              onClick={() => setLocalShowAnswer(s => !s)}
              title={localShowAnswer ? 'Hide answer' : 'Show answer'}
            >
              {localShowAnswer ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          )}
          <button
            className="btn btn-icon btn-ghost btn-sm"
            onClick={() => setExpanded(e => !e)}
          >
            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>
      </div>

      {!expanded && (
        <p className="text-sm truncate" style={{ color: 'var(--text-secondary)', paddingLeft: '2.5rem' }}>
          {question.question_text}
        </p>
      )}

      {expanded && (
        <>
          {/* Question text */}
          <p
            style={{
              fontSize: '0.95rem',
              lineHeight: 1.65,
              marginBottom: '1.25rem',
              color: 'var(--text-primary)',
              paddingLeft: '2.5rem',
            }}
          >
            {question.question_text}
          </p>

          {/* MCQ Options */}
          {isMCQ && question.options && (
            <div style={{ paddingLeft: '2.5rem' }}>
              {OPTION_LABELS.map((key) => (
                question.options[key] && (
                  <div
                    key={key}
                    style={getOptionStyle(key)}
                    onClick={() => quizMode && !resultsMode && onAnswer && onAnswer(question.id, key)}
                  >
                    <span style={getOptionLabelStyle(key)}>{key}</span>
                    <span style={{ fontSize: '0.9rem', lineHeight: 1.55 }}>{question.options[key]}</span>
                  </div>
                )
              ))}
            </div>
          )}

          {/* FITB Answer area */}
          {isFITB && (
            <div style={{ paddingLeft: '2.5rem' }}>
              {quizMode && !resultsMode ? (
                <input
                  className="form-input"
                  placeholder="Type your answer..."
                  value={selectedAnswer || ''}
                  onChange={(e) => onAnswer && onAnswer(question.id, e.target.value)}
                  style={{ maxWidth: 380 }}
                />
              ) : (
                showAnswer && (
                  <div
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      padding: '0.5rem 1rem',
                      background: 'rgba(45,106,79,0.08)',
                      border: '1.5px solid rgba(45,106,79,0.3)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <span style={{ fontSize: '0.78rem', color: 'var(--accent-green)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Answer:</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{question.correct_answer}</span>
                  </div>
                )
              )}

              {/* Results mode FITB */}
              {resultsMode && (
                <div className="flex gap-3 flex-wrap">
                  <div style={{ padding: '0.4rem 0.9rem', borderRadius: 'var(--radius-md)', background: 'rgba(45,106,79,0.08)', border: '1px solid rgba(45,106,79,0.25)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--accent-green)', fontWeight: 600 }}>Correct: </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>{correctAnswer}</span>
                  </div>
                  {userAnswer && userAnswer !== correctAnswer && (
                    <div style={{ padding: '0.4rem 0.9rem', borderRadius: 'var(--radius-md)', background: 'rgba(193,64,74,0.08)', border: '1px solid rgba(193,64,74,0.25)' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--accent-red)', fontWeight: 600 }}>Your answer: </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>{userAnswer}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Explanation */}
          {showAnswer && question.explanation && (
            <div
              style={{
                marginTop: '1rem',
                padding: '0.75rem 1rem',
                background: 'rgba(201,151,58,0.06)',
                borderRadius: 'var(--radius-md)',
                borderLeft: '3px solid var(--accent-gold)',
                marginLeft: '2.5rem',
              }}
            >
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <strong style={{ color: 'var(--accent-gold)' }}>Explanation: </strong>
                {question.explanation}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
