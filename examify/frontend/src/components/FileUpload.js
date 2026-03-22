/**
 * Examify FileUpload Component
 * Drag-and-drop file upload with progress tracking.
 */

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import { uploadFile } from '../utils/api';

const ACCEPTED_TYPES = {
  'application/pdf': ['.pdf'],
  'application/vnd.ms-powerpoint': ['.ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
};

const MAX_SIZE_MB = 50;

export default function FileUpload({ onUploadSuccess }) {
  const [uploadState, setUploadState] = useState('idle'); // idle | uploading | success | error
  const [progress, setProgress] = useState(0);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleDrop = useCallback(async (acceptedFiles, rejectedFiles) => {
    if (rejectedFiles.length > 0) {
      const reason = rejectedFiles[0].errors[0]?.message || 'File rejected';
      setErrorMsg(reason);
      setUploadState('error');
      return;
    }

    const file = acceptedFiles[0];
    if (!file) return;

    setUploadState('uploading');
    setProgress(0);
    setErrorMsg('');

    try {
      const result = await uploadFile(file, (pct) => setProgress(pct));
      setUploadedFile(result.file);
      setUploadState('success');
      toast.success(`"${file.name}" uploaded successfully!`);
      onUploadSuccess && onUploadSuccess(result.file);
    } catch (err) {
      setErrorMsg(err.message || 'Upload failed');
      setUploadState('error');
      toast.error(err.message || 'Upload failed');
    }
  }, [onUploadSuccess]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop: handleDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_SIZE_MB * 1024 * 1024,
    multiple: false,
    disabled: uploadState === 'uploading',
  });

  const reset = () => {
    setUploadState('idle');
    setProgress(0);
    setUploadedFile(null);
    setErrorMsg('');
  };

  const getBorderColor = () => {
    if (isDragReject || uploadState === 'error') return 'var(--accent-red)';
    if (isDragActive) return 'var(--accent-gold)';
    if (uploadState === 'success') return 'var(--accent-green)';
    return 'var(--border-strong)';
  };

  const getBg = () => {
    if (isDragActive) return 'rgba(201,151,58,0.05)';
    if (uploadState === 'success') return 'rgba(45,106,79,0.04)';
    if (uploadState === 'error') return 'rgba(193,64,74,0.04)';
    return 'var(--bg-secondary)';
  };

  return (
    <div>
      <div
        {...getRootProps()}
        style={{
          border: `2px dashed ${getBorderColor()}`,
          borderRadius: 'var(--radius-lg)',
          background: getBg(),
          padding: '3rem 2rem',
          textAlign: 'center',
          cursor: uploadState === 'uploading' ? 'not-allowed' : 'pointer',
          transition: 'all 200ms ease',
          outline: 'none',
        }}
      >
        <input {...getInputProps()} />

        {/* Idle / Drag state */}
        {uploadState === 'idle' && (
          <>
            <div style={{
              width: 56, height: 56,
              borderRadius: 'var(--radius-md)',
              background: isDragActive ? 'rgba(201,151,58,0.15)' : 'var(--bg-card)',
              border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.25rem',
              transition: 'all 200ms',
            }}>
              <Upload size={24} color={isDragActive ? 'var(--accent-gold)' : 'var(--text-muted)'} />
            </div>
            <h3 style={{ marginBottom: '0.5rem', fontFamily: 'var(--font-display)' }}>
              {isDragActive ? 'Drop your file here' : 'Upload Lecture Slides'}
            </h3>
            <p className="text-muted text-sm" style={{ marginBottom: '1.25rem' }}>
              Drag and drop your file, or click to browse
            </p>
            <div className="flex items-center justify-center gap-3">
              {['PDF', 'PPT', 'PPTX'].map(ext => (
                <span key={ext} className="badge badge-neutral">
                  <FileText size={10} />
                  {ext}
                </span>
              ))}
            </div>
            <p className="text-xs text-muted mt-4">Maximum file size: {MAX_SIZE_MB}MB</p>
          </>
        )}

        {/* Uploading */}
        {uploadState === 'uploading' && (
          <>
            <div style={{ marginBottom: '1.5rem' }}>
              <div className="spinner spinner-lg" style={{ margin: '0 auto 1rem' }} />
              <h3 style={{ marginBottom: '0.5rem', fontFamily: 'var(--font-display)' }}>
                Uploading...
              </h3>
              <p className="text-muted text-sm">{progress}% complete</p>
            </div>
            <div className="progress-bar" style={{ maxWidth: 320, margin: '0 auto' }}>
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </>
        )}

        {/* Success */}
        {uploadState === 'success' && uploadedFile && (
          <>
            <CheckCircle size={40} color="var(--accent-green)" style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ marginBottom: '0.5rem', fontFamily: 'var(--font-display)', color: 'var(--accent-green)' }}>
              Upload Complete!
            </h3>
            <p className="text-muted text-sm" style={{ marginBottom: '0.5rem' }}>
              <strong style={{ color: 'var(--text-primary)' }}>{uploadedFile.original_filename}</strong>
            </p>
            <p className="text-xs text-muted">
              {(uploadedFile.file_size / 1024).toFixed(1)} KB · Extracting text...
            </p>
          </>
        )}

        {/* Error */}
        {uploadState === 'error' && (
          <>
            <AlertCircle size={40} color="var(--accent-red)" style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ marginBottom: '0.5rem', fontFamily: 'var(--font-display)', color: 'var(--accent-red)' }}>
              Upload Failed
            </h3>
            <p className="text-muted text-sm">{errorMsg}</p>
          </>
        )}
      </div>

      {(uploadState === 'error' || uploadState === 'success') && (
        <div className="flex justify-center mt-4">
          <button className="btn btn-ghost btn-sm" onClick={reset}>
            Upload Another File
          </button>
        </div>
      )}
    </div>
  );
}
