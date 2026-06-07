import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';


interface Settings {
  theme: string;
  refreshInterval: number;
  openrouterEndpoint: string;
  openrouterApiKey: string;
  openrouterPrompt: string;
  openrouterModel: string;
}

const DEFAULT_MODELS = [
  'openrouter/free',
];

export function AdminAppPage() {
  const [promptDraft, setPromptDraft] = useState('');
  const [promptSaved, setPromptSaved] = useState(false);

  const { data: settings, isLoading: settingsLoading } = useQuery<Settings>({
    queryKey: ['settings'],
    queryFn: () => api.get<Settings>('/settings'),
    staleTime: 1000 * 60,
  });
  const queryClient = useQueryClient();

  // Initialize draft when settings load
  useEffect(() => {
    if (settings?.openrouterPrompt !== undefined) {
      setPromptDraft(settings.openrouterPrompt);
    }
  }, [settings?.openrouterPrompt]);

  const themeMutation = useMutation({
    mutationFn: (newTheme: string) => api.put('/settings/theme', { theme: newTheme }),
    onSuccess: (_, newTheme) => {
      document.documentElement.setAttribute('data-theme', newTheme);
      queryClient.setQueryData(['settings'], (old: Settings | undefined) =>
        old ? { ...old, theme: newTheme } : old
      );
    },
    onError: (error) => {
      alert(`Failed to change theme: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });

  const refreshMutation = useMutation({
    mutationFn: (secs: number) => api.put('/settings/refreshInterval', { refreshInterval: secs }),
    onSuccess: (_, secs) => {
      queryClient.setQueryData(['settings'], (old: Settings | undefined) =>
        old ? { ...old, refreshInterval: secs } : old
      );
    },
    onError: (error) => {
      alert(`Failed to update refresh interval: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });

  const openrouterEndpointMutation = useMutation({
    mutationFn: (endpoint: string) => api.put('/settings/openrouterEndpoint', { openrouterEndpoint: endpoint }),
    onSuccess: (_, endpoint) => {
      queryClient.setQueryData(['settings'], (old: Settings | undefined) =>
        old ? { ...old, openrouterEndpoint: endpoint } : old
      );
    },
    onError: (error) => {
      alert(`Failed to update OpenRouter endpoint: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });

  const openrouterApiKeyMutation = useMutation({
    mutationFn: (apiKey: string) => api.put('/settings/openrouterApiKey', { openrouterApiKey: apiKey }),
    onSuccess: (_, apiKey) => {
      queryClient.setQueryData(['settings'], (old: Settings | undefined) =>
        old ? { ...old, openrouterApiKey: apiKey } : old
      );
    },
    onError: (error) => {
      alert(`Failed to update OpenRouter API key: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });

  const openrouterPromptMutation = useMutation({
    mutationFn: (prompt: string) => api.put('/settings/openrouterPrompt', { openrouterPrompt: prompt }),
    onSuccess: (_, prompt) => {
      queryClient.setQueryData(['settings'], (old: Settings | undefined) =>
        old ? { ...old, openrouterPrompt: prompt } : old
      );
      setPromptSaved(true);
    },
    onError: (error) => {
      alert(`Failed to update OpenRouter prompt: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });

  const openrouterModelMutation = useMutation({
    mutationFn: (model: string) => api.put('/settings/openrouterModel', { openrouterModel: model }),
    onSuccess: (_, model) => {
      queryClient.setQueryData(['settings'], (old: Settings | undefined) =>
        old ? { ...old, openrouterModel: model } : old
      );
    },
    onError: (error) => {
      alert(`Failed to update OpenRouter model: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });

  const isLoading = settingsLoading;
  const openrouterEndpoint = settings?.openrouterEndpoint ?? '';
  const openrouterApiKey = settings?.openrouterApiKey ?? '';
  const openrouterModel = settings?.openrouterModel ?? DEFAULT_MODELS[0];

  if (isLoading) return <div className="loading">Loading settings...</div>;

  return (
    <div className="page">
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-header">
          <h2>Application Settings</h2>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1rem', padding: '1rem' }}>
          <span>Theme:</span>
          <select
            className="btn"
            style={{ padding: '0.25rem 0.5rem', background: 'var(--surface)', color: 'inherit', border: '1px solid var(--border)' }}
            value={settings?.theme || 'terminal'}
            onChange={(e) => themeMutation.mutate(e.target.value)}
            disabled={themeMutation.isPending}
          >
            <option value="terminal">Nerd Terminal (Matrix)</option>
            <option value="classic">Quiz Classic (Phase 1)</option>
          </select>

          <span style={{ marginLeft: '1.5rem' }}>Poll interval:</span>
          <select
            className="btn"
            style={{ padding: '0.25rem 0.5rem', background: 'var(--surface)', color: 'inherit', border: '1px solid var(--border)' }}
            value={settings?.refreshInterval ?? 5}
            onChange={(e) => refreshMutation.mutate(Number(e.target.value))}
            disabled={refreshMutation.isPending}
          >
            <option value={2}>2 s</option>
            <option value={5}>5 s</option>
            <option value={10}>10 s</option>
            <option value={30}>30 s</option>
            <option value={60}>60 s</option>
          </select>
          {(themeMutation.isPending || refreshMutation.isPending) && (
            <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Saving…</span>
          )}
          <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Changes apply globally to all users.</span>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-header">
          <h2>OpenRouter AI Settings</h2>
        </div>
        <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label>OpenRouter Endpoint</label>
            <input
              type="text"
              defaultValue={openrouterEndpoint}
              onChange={(e) => openrouterEndpointMutation.mutate(e.target.value)}
              disabled={openrouterEndpointMutation.isPending}
              placeholder="https://openrouter.ai/api/v1/chat/completions"
              style={{ width: '100%', padding: '0.5rem', fontSize: '0.875rem' }}
            />
          </div>
          <div className="form-group">
            <label>OpenRouter API Key</label>
            <input
              type="password"
              defaultValue={openrouterApiKey}
              onChange={(e) => openrouterApiKeyMutation.mutate(e.target.value)}
              disabled={openrouterApiKeyMutation.isPending}
              placeholder="sk-..."
              style={{ width: '100%', padding: '0.5rem', fontSize: '0.875rem' }}
            />
          </div>
          <div className="form-group">
            <label>OpenRouter Model</label>
            <select
              defaultValue={openrouterModel}
              onChange={(e) => openrouterModelMutation.mutate(e.target.value)}
              disabled={openrouterModelMutation.isPending}
              style={{ width: '100%', padding: '0.5rem', fontSize: '0.875rem' }}
            >
              {DEFAULT_MODELS.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Prompt Template</label>
            <textarea
              value={promptDraft}
              onChange={(e) => {
                setPromptDraft(e.target.value);
                setPromptSaved(false);
              }}
              disabled={openrouterPromptMutation.isPending}
              rows={4}
              placeholder="Complete the following quiz question JSON. Fill in any missing fields (category, difficulty, info, answer options, and correct answer). For category and difficulty, return the name as a string. (e.g., 'Science', 'Easy') Put the correct answer randomly in A,B,C or D and set correctAnswer accordingly. Return only valid JSON with fields: questionText, category (string), difficulty (string), info (string), answerA, answerB, answerC, answerD, correctAnswer. Question JSON: "
              style={{ width: '100%', padding: '0.5rem', fontSize: '0.875rem', fontFamily: 'monospace' }}
            />
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => openrouterPromptMutation.mutate(promptDraft)}
                disabled={openrouterPromptMutation.isPending || promptSaved}
              >
                {openrouterPromptMutation.isPending ? 'Saving…' : promptSaved ? 'Saved' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}