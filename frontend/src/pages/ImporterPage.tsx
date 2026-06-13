import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { useRef, useState } from 'react';

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api';

async function readJsonSafe<T>(res: Response): Promise<T | undefined> {
  const text = await res.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as T;
  } catch {
    return undefined;
  }
}

interface QuestionsMeta {
  difficulties: { id: number; name: string }[];
}

export function ImporterPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [questionCount, setQuestionCount] = useState<number>(0);
  const [importProgress, setImportProgress] = useState(0);

  const { data: meta } = useQuery<QuestionsMeta>({
    queryKey: ['questions', 'meta'],
    queryFn: () => api.get<QuestionsMeta>('/questions/meta'),
    staleTime: 1000 * 60 * 5,
  });


  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setIsImporting(true);
    setImportProgress(0);

    // Count questions for time estimation (1 sec per question)
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    const estimatedCount = Math.max(0, lines.length - 1); // Subtract header
    setQuestionCount(estimatedCount);

    const form = new FormData();
    form.append('file', file);

    // Progress timer - increments every second, shows "Importing..." during processing
    let timeElapsed = 0;
    const progressInterval = setInterval(() => {
      timeElapsed++;
      setImportProgress(Math.min(timeElapsed, estimatedCount));
    }, 1000);
    // Set initial progress to 1 immediately for small imports
    setImportProgress(1);

    try {
      const res = await fetch(`${API_BASE}/questions/import/csv`, {
        method: 'POST',
        credentials: 'include',
        body: form,
      });
      clearInterval(progressInterval);
      if (!res.ok) {
        const err = await readJsonSafe<{ message?: string | string[] }>(res);
        const msg = Array.isArray(err?.message)
          ? err?.message[0]
          : err?.message;
        setError(msg ?? `${res.status} ${res.statusText}`);
      } else {
        const data = await readJsonSafe<{ imported?: number }>(res);
        setImportProgress(data?.imported ?? questionCount ?? 0);
        alert(`Imported ${data?.imported ?? 0} question(s).`);
      }
    } catch (networkError) {
      clearInterval(progressInterval);
      setError(networkError instanceof Error ? networkError.message : 'Network error during import');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
      setIsImporting(false);
    }
  }

  return (
    <div className="page">
      <div className="card">
        <div className="card-header">
          <h2>Question Import</h2>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()} disabled={isImporting}>
              Import CSV
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              onChange={handleImport}
              disabled={isImporting}
            />
          </div>
        </div>

        {isImporting && (
          <div style={{ padding: '1rem' }}>
            <div className="progress-bar-label">
              {questionCount > 0
                ? `Imported ${importProgress} of ${questionCount} question${questionCount !== 1 ? 's' : ''}...`
                : 'Starting import...'}
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: questionCount ? `${(importProgress / questionCount) * 100}%` : '100%',
                }}
              />
            </div>
          </div>
        )}

        {error && <div className="alert alert-error">{error}</div>}

        <div style={{ padding: '1rem' }}>
          <p>
            As an IMPORTER, you can add new questions to the database via CSV import.
            You cannot edit or delete existing questions.
          </p>
          <p>
            <strong>Important:</strong> If your CSV contains a questionId that already exists in the database,
            the import will fail. Leave the questionId column empty to generate a new unique ID automatically.
          </p>

          <div className="template-info" style={{ marginTop: '1rem', padding: '1rem', border: '1px solid var(--border)' }}>
            <h4 style={{ marginTop: 0, marginBottom: '0.5rem' }}>📋 CSV Template Format</h4>
            <p style={{ marginBottom: '0.5rem' }}>
              The CSV file should use semicolons (;) as separators and include these columns:
            </p>
            <ul style={{ marginBottom: '0.5rem', paddingLeft: '1.5rem' }}>
              <li><strong>questionId</strong> — Leave empty for auto-generation (recommended)</li>
              <li><strong>questionText</strong> — The quiz question</li>
              <li><strong>answerA, answerB, answerC, answerD</strong> — The four answer options</li>
              <li><strong>correctAnswer</strong> — A, B, C, or D</li>
              <li><strong>category</strong> — Category name (will be created if new)</li>
              <li><strong>difficulty</strong> — Must exist: {meta?.difficulties.map((d) => d.name).join(', ') ?? '...'}</li>
              <li><strong>info</strong> — Optional explanation for results</li>
            </ul>
            <p style={{ marginBottom: 0 }}>
              <a href="/questions_template.csv" download className="btn btn-sm">Download Template</a>
            </p>
          </div>

          <p className="muted" style={{ marginTop: '1rem', fontSize: '0.85rem' }}>
            <strong>Available Difficulties:</strong> {meta?.difficulties.map((d) => d.name).join(', ') ?? 'Loading...'}
          </p>
        </div>
      </div>
    </div>
  );
}