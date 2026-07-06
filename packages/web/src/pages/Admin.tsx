import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { POEMS } from '@gedichtenv2/shared';
import { usePoemsContext } from '../context/PoemsContext';
import { apiLogin, apiUpdatePoem, apiUploadImage, apiResetPoem } from '../lib/api';
import '../styles/admin.css';

type EditState = {
  overlay: string;
  imageFile: File | null;
  imagePreview: string | null;
};

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

// ── Login ────────────────────────────────────────────────────────────────────

function LoginPage({ onLogin }: { onLogin: (token: string) => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const token = await apiLogin(password);
      onLogin(token);
    } catch {
      setError('Incorrect password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-wrap">
      <form className="admin-login" onSubmit={handleSubmit}>
        <h1>Admin</h1>
        <div>
          <label className="admin-field-label" htmlFor="admin-password">Password</label>
          <input
            id="admin-password"
            type="password"
            className="admin-input"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoFocus
            required
          />
        </div>
        {error && <p className="admin-login-error">{error}</p>}
        <button type="submit" className="admin-btn admin-btn-primary" disabled={loading}>
          {loading ? 'Logging in…' : 'Log in'}
        </button>
      </form>
    </div>
  );
}

// ── Poem edit card ────────────────────────────────────────────────────────────

function PoemCard({
  poem,
  edit,
  onChange,
  onSave,
  onReset,
  status,
}: {
  poem: (typeof POEMS)[number];
  edit: EditState;
  onChange: (patch: Partial<EditState>) => void;
  onSave: () => void;
  onReset: () => void;
  status: SaveStatus;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    const preview = URL.createObjectURL(file);
    onChange({ imageFile: file, imagePreview: preview });
  };

  return (
    <div className="admin-poem-card">
      <div className="admin-poem-image-col">
        <img
          src={edit.imagePreview ?? poem.image}
          alt={poem.title}
          className="admin-poem-thumb"
        />
        <p className="admin-poem-title">{poem.title}</p>
        <p className="admin-poem-id">{poem.id}</p>
      </div>

      <div className="admin-poem-fields">
        <div>
          <label className="admin-field-label">Overlay text</label>
          <textarea
            className="admin-overlay-textarea"
            value={edit.overlay}
            onChange={e => onChange({ overlay: e.target.value })}
          />
        </div>

        <div>
          <label className="admin-field-label">Background image</label>
          <div className="admin-image-row">
            <label className="admin-file-label">
              Choose file
              <input
                ref={fileInputRef}
                type="file"
                className="admin-file-input"
                accept="image/*"
                onChange={handleFileChange}
              />
            </label>
            {edit.imageFile && (
              <span className="admin-file-name">{edit.imageFile.name}</span>
            )}
            {edit.imagePreview && (
              <img src={edit.imagePreview} className="admin-image-preview" alt="Preview" />
            )}
          </div>
        </div>

        <div className="admin-actions">
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={onSave}
            disabled={status === 'saving'}
          >
            {status === 'saving' ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            className="admin-btn"
            onClick={onReset}
            disabled={status === 'saving'}
          >
            Reset to original
          </button>
          {status === 'saved' && <span className="admin-save-status">Saved</span>}
          {status === 'error' && <span className="admin-save-status" style={{ color: '#e05a5a' }}>Error saving</span>}
        </div>
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

function Dashboard({ token, onLogout }: { token: string; onLogout: () => void }) {
  const { poems, loading, refreshPoems } = usePoemsContext();
  const [edits, setEdits] = useState<Record<string, EditState>>({});
  const [statuses, setStatuses] = useState<Record<string, SaveStatus>>({});
  const initialized = useRef(false);

  // Initialize edit state once the live poem data has loaded
  useEffect(() => {
    if (initialized.current || loading) return;
    initialized.current = true;
    setEdits(
      Object.fromEntries(poems.map(p => [p.id, { overlay: p.overlay ?? '', imageFile: null, imagePreview: null }]))
    );
  }, [poems, loading]);

  const patchEdit = (id: string, patch: Partial<EditState>) => {
    setEdits(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const setStatus = (id: string, status: SaveStatus) => {
    setStatuses(prev => ({ ...prev, [id]: status }));
  };

  const handleSave = async (id: string) => {
    const edit = edits[id];
    if (!edit) return;
    setStatus(id, 'saving');
    try {
      let imageUrl: string | undefined;
      if (edit.imageFile) {
        imageUrl = await apiUploadImage(id, edit.imageFile);
      }
      await apiUpdatePoem(id, { overlay: edit.overlay, ...(imageUrl ? { image: imageUrl } : {}) });
      // clear the pending file after successful upload
      patchEdit(id, { imageFile: null, imagePreview: imageUrl ?? edit.imagePreview });
      await refreshPoems();
      setStatus(id, 'saved');
      setTimeout(() => setStatus(id, 'idle'), 3000);
    } catch {
      setStatus(id, 'error');
      setTimeout(() => setStatus(id, 'idle'), 4000);
    }
  };

  const handleReset = async (id: string) => {
    setStatus(id, 'saving');
    try {
      await apiResetPoem(id);
      await refreshPoems();
      // Reset local edit to original hardcoded values
      const original = POEMS.find(p => p.id === id);
      if (original) {
        patchEdit(id, { overlay: original.overlay ?? '', imageFile: null, imagePreview: null });
      }
      setStatus(id, 'saved');
      setTimeout(() => setStatus(id, 'idle'), 3000);
    } catch {
      setStatus(id, 'error');
      setTimeout(() => setStatus(id, 'idle'), 4000);
    }
  };

  return (
    <div className="admin-page">
      <header className="admin-header">
        <h1>Admin Portal</h1>
        <button type="button" className="admin-btn" onClick={onLogout}>Log out</button>
      </header>

      {loading ? (
        <p style={{ textAlign: 'center', padding: '64px 0', opacity: 0.5 }}>Loading poems…</p>
      ) : (
        <div className="admin-poem-list">
          {poems.map(poem => (
            <PoemCard
              key={poem.id}
              poem={poem}
              edit={edits[poem.id] ?? { overlay: poem.overlay ?? '', imageFile: null, imagePreview: null }}
              onChange={patch => patchEdit(poem.id, patch)}
              onSave={() => handleSave(poem.id)}
              onReset={() => handleReset(poem.id)}
              status={statuses[poem.id] ?? 'idle'}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Admin entry point ─────────────────────────────────────────────────────────

export default function Admin() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('admin_token'));

  const handleLogin = (t: string) => {
    localStorage.setItem('admin_token', t);
    setToken(t);
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setToken(null);
  };

  if (!token) return <LoginPage onLogin={handleLogin} />;
  return <Dashboard token={token} onLogout={handleLogout} />;
}
