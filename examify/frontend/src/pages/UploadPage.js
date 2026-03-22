/**
 * Examify Upload Page
 * File upload with post-upload status tracking and question generation trigger.
 */

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, CheckCircle, Loader, AlertCircle, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import FileUpload from '../components/FileUpload';
import { generateQuestions } from '../utils/api';
import { useFileStatus, useQuestionSetStatus } from '../hooks/useExamify';

const STEPS = [
  { id: 1, label: 'Upload File' },
  { id: 2, label: 'Extract Text' },
  { id: 3, label: 'Generate Questions' },
  { id: 4, label: 'Ready!' },
];

export default function UploadPage() {
  const navigate = useNavigate();
  const [uploadedFile, setUploadedFile] = useState(null);
  const [questionSet, setQuestionSet] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [targetMcq, setTargetMcq] = useState(70);
  const [targetFitb, setTargetFitb] = useState(30);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState(null);

  // Poll file extraction status
  const fileStatus = useFileStatus(
    uploadedFile && currentStep === 2 ? uploadedFile.id : null,
    useCallback((data) => {
      if (data.status === 'ready' || data.status === 'questions_ready') {
        setCurrentStep(3);
      }
    }, [])
  );

  // Poll question generation status
  const qsStatus = useQuestionSetStatus(
    questionSet && currentStep === 3 ? questionSet.id : null,
    useCallback((data) => {
      if (data.status === 'ready') {
        setCurrentStep(4);
        toast.success(`${data.total_questions} questions generated!`);
      }
    }, [])
  );

  const handleUploadSuccess = (file) => {
    setUploadedFile(file);
    setCurrentStep(2);
  };

  const handleGenerateQuestions = async () => {
    if (!uploadedFile) return;
    setGenerating(true);
    setGenError(null);
    try {
      const res = await generateQuestions(uploadedFile.id, targetMcq, targetFitb);
      setQuestionSet(res.question_set);
      toast.success('Question generation started!');
    } catch (err) {
      setGenError(err.message);
      toast.error(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const isExtracting = fileStatus?.status === 'processing' || fileStatus?.status === 'uploaded';
  const extractionError = fileStatus?.status === 'error';

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-meta">New Session</div>
        <h1>Upload Lecture Slides</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
          Upload a PDF or PowerPoint file and get AI-generated exam questions in minutes.
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-0" style={{ marginBottom: '2.5rem' }}>
        {STEPS.map((step, i) => (
          <React.Fragment key={step.id}>
            <div className="flex items-center gap-2">
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.8rem', fontWeight: 700,
                background: currentStep > step.id ? 'var(--accent-green)'
                  : currentStep === step.id ? 'var(--accent-gold)' : 'var(--bg-secondary)',
                color: currentStep >= step.id ? (currentStep === step.id ? '#0f0d0a' : '#fff') : 'var(--text-muted)',
                border: `2px solid ${currentStep > step.id ? 'var(--accent-green)'
                  : currentStep === step.id ? 'var(--accent-gold)' : 'var(--border)'}`,
                transition: 'all 300ms',
              }}>
                {currentStep > step.id ? <CheckCircle size={16} /> : step.id}
              </div>
              <span style={{
                fontSize: '0.82rem', fontWeight: currentStep === step.id ? 600 : 400,
                color: currentStep >= step.id ? 'var(--text-primary)' : 'var(--text-muted)',
              }}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{
                flex: 1, height: 2, margin: '0 0.75rem',
                background: currentStep > step.id ? 'var(--accent-green)' : 'var(--border)',
                transition: 'background 300ms',
              }} />
            )}
          </React.Fragment>
        ))}
      </div>

      <div style={{ maxWidth: 700 }}>
        {/* Step 1: Upload */}
        {currentStep === 1 && (
          <div className="fade-in">
            <FileUpload onUploadSuccess={handleUploadSuccess} />
          </div>
        )}

        {/* Step 2: Extraction */}
        {currentStep === 2 && (
          <div className="card fade-in" style={{ textAlign: 'center', padding: '3rem' }}>
            {extractionError ? (
              <>
                <AlertCircle size={44} color="var(--accent-red)" style={{ margin: '0 auto 1rem' }} />
                <h3 style={{ marginBottom: '0.5rem' }}>Extraction Failed</h3>
                <p className="text-muted text-sm">{fileStatus?.error_message || 'Could not extract text from file.'}</p>
              </>
            ) : (
              <>
                <div className="spinner spinner-lg" style={{ margin: '0 auto 1.5rem' }} />
                <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>
                  Extracting Text...
                </h3>
                <p className="text-muted text-sm">
                  Reading your lecture file: <strong style={{ color: 'var(--text-primary)' }}>{uploadedFile?.original_filename}</strong>
                </p>
                <p className="text-xs text-muted" style={{ marginTop: '0.5rem' }}>This usually takes 10–30 seconds</p>
              </>
            )}
          </div>
        )}

        {/* Step 3: Generate */}
        {currentStep === 3 && !questionSet && (
          <div className="card fade-in">
            <div style={{ marginBottom: '1.5rem' }}>
              <CheckCircle size={28} color="var(--accent-green)" style={{ marginBottom: '0.75rem' }} />
              <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>
                Text Extracted Successfully!
              </h3>
              <p className="text-muted text-sm">
                Configure how many questions to generate from <strong style={{ color: 'var(--text-primary)' }}>{uploadedFile?.original_filename}</strong>
              </p>
            </div>

            <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label">Multiple Choice (MCQ)</label>
                <input
                  type="number"
                  className="form-input"
                  value={targetMcq}
                  min={10} max={150}
                  onChange={e => setTargetMcq(parseInt(e.target.value) || 70)}
                />
                <p className="text-xs text-muted">4 options, 1 correct answer</p>
              </div>
              <div className="form-group">
                <label className="form-label">Fill in the Blank</label>
                <input
                  type="number"
                  className="form-input"
                  value={targetFitb}
                  min={5} max={80}
                  onChange={e => setTargetFitb(parseInt(e.target.value) || 30)}
                />
                <p className="text-xs text-muted">Key concept completion</p>
              </div>
            </div>

            <div style={{
              padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)',
              background: 'rgba(201,151,58,0.06)', border: '1px solid rgba(201,151,58,0.2)',
              marginBottom: '1.5rem',
            }}>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Total: <strong style={{ color: 'var(--accent-gold)' }}>{targetMcq + targetFitb} questions</strong> will be generated. 
                Generation takes 1–3 minutes depending on file length.
              </p>
            </div>

            {genError && (
              <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'rgba(193,64,74,0.08)', border: '1px solid rgba(193,64,74,0.2)', marginBottom: '1rem', color: 'var(--accent-red)', fontSize: '0.88rem' }}>
                {genError}
              </div>
            )}

            <button
              className="btn btn-primary"
              onClick={handleGenerateQuestions}
              disabled={generating}
            >
              {generating ? <><Loader size={15} className="spin" /> Starting...</> : <><Zap size={15} /> Generate {targetMcq + targetFitb} Questions</>}
            </button>
          </div>
        )}

        {/* Step 3: Generating in progress */}
        {currentStep === 3 && questionSet && (
          <div className="card fade-in" style={{ textAlign: 'center', padding: '3rem' }}>
            <div className="spinner spinner-lg" style={{ margin: '0 auto 1.5rem' }} />
            <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>
              AI is Generating Questions...
            </h3>
            <p className="text-muted text-sm">
              Crafting {targetMcq + targetFitb} exam-quality questions from your lecture content.
            </p>
            <p className="text-xs text-muted" style={{ marginTop: '0.5rem' }}>
              This takes 1–3 minutes. You'll be redirected automatically.
            </p>
            {qsStatus && qsStatus.total_questions > 0 && (
              <p className="text-sm" style={{ marginTop: '1rem', color: 'var(--accent-gold)' }}>
                {qsStatus.total_questions} questions ready so far...
              </p>
            )}
          </div>
        )}

        {/* Step 4: Done */}
        {currentStep === 4 && qsStatus && (
          <div className="card fade-in" style={{ textAlign: 'center', padding: '3rem' }}>
            <CheckCircle size={48} color="var(--accent-green)" style={{ margin: '0 auto 1rem' }} />
            <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>
              Questions Ready!
            </h2>
            <p className="text-muted text-sm" style={{ marginBottom: '0.5rem' }}>
              <strong style={{ color: 'var(--text-primary)' }}>{qsStatus.total_questions}</strong> questions generated
            </p>
            <div className="flex items-center justify-center gap-3" style={{ margin: '1rem 0 1.5rem' }}>
              <span className="badge badge-mcq">{qsStatus.mcq_count} MCQ</span>
              <span className="badge badge-fitb">{qsStatus.fitb_count} Fill-in</span>
            </div>
            <div className="flex items-center justify-center gap-3">
              <button
                className="btn btn-primary"
                onClick={() => navigate(`/quiz/${questionSet.id}`)}
              >
                <Zap size={15} />
                Start Quiz
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => navigate(`/questions/${questionSet.id}`)}
              >
                View All Questions
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
