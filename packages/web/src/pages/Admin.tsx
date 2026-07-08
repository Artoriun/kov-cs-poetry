import { useState, useEffect, useLayoutEffect, useRef, type ChangeEvent } from 'react';
import { type Poem } from '@gedichtenv2/shared';
import Header from '../components/Header';
import { usePoemsContext } from '../context/PoemsContext';
import { apiLogin, apiUpdatePoem, apiUploadImage, apiUpdateOrder, apiAddPoem } from '../lib/api';

const PLACEHOLDER_IMAGE = "https://res.cloudinary.com/dgk299isx/image/upload/v1781699336/1000008716_LE_ultra_custom_kcfcsj.png";
const DRAFT_OVERLAY = 'Lorem ipsum dolor sit amet,\nconsectetur adipiscing elit,\nsed do eiusmod tempor incididunt,\nut labore et dolore magna aliqua.';
import '../styles/admin.css';

type EditState = {
  title: string;
  overlay: string;
  imageFile: File | null;
  imagePreview: string | null;
};

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

// ── Login ────────────────────────────────────────────────────────────────────

function LoginPage({ onLogin }: { onLogin: (token: string) => void }) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="admin-page">
      <Header />
      <div className="admin-login-wrap">
      <form className="admin-login" onSubmit={handleSubmit}>
        <h1>Admin</h1>
        <div>
          <label className="admin-field-label" htmlFor="admin-password">Password</label>
          <div className="admin-password-wrap">
            <input
              id="admin-password"
              type={showPassword ? 'text' : 'password'}
              className="admin-input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoFocus
              required
            />
            <button
              type="button"
              className="admin-password-toggle"
              onClick={() => setShowPassword(v => !v)}
              tabIndex={-1}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
        {error && <p className="admin-login-error">{error}</p>}
        <button type="submit" className="admin-btn admin-btn-primary" disabled={loading}>
          {loading ? 'Logging in…' : 'Log in'}
        </button>
      </form>
      </div>
    </div>
  );
}

// ── Poem edit card ────────────────────────────────────────────────────────────

function PoemCard({
  poem,
  edit,
  onChange,
  onSave,
  onToggleFeature,
  onDelete,
  status,
  onDragStart,
  onDragEnd,
  isDragging,
}: {
  poem: Poem;
  edit: EditState;
  onChange: (patch: Partial<EditState>) => void;
  onSave: () => void;
  onToggleFeature: () => void;
  onDelete: () => void;
  status: SaveStatus;
  onDragStart: () => void;
  onDragEnd: () => void;
  isDragging: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    onChange({ imageFile: file, imagePreview: URL.createObjectURL(file) });
  };

  return (
    <div
      className={`admin-poem-card${isDragging ? ' dragging' : ''}${poem.featured ? ' poem-highlight-static' : ''}`}
      draggable
      onMouseDown={e => {
        const card = e.currentTarget as HTMLElement;
        card.draggable = !(e.target as Element).closest('input, textarea');
      }}
      onTouchStart={e => {
        const card = e.currentTarget as HTMLElement;
        card.draggable = !(e.target as Element).closest('input, textarea');
      }}
      onDragStart={e => {
        const el = e.currentTarget as HTMLElement;
        const ghost = el.cloneNode(true) as HTMLElement;
        ghost.style.cssText += ';position:fixed;top:-9999px;left:-9999px;width:' + el.offsetWidth + 'px;pointer-events:none;';
        document.body.appendChild(ghost);
        e.dataTransfer.setDragImage(ghost, e.nativeEvent.offsetX, e.nativeEvent.offsetY);
        requestAnimationFrame(() => document.body.removeChild(ghost));
        onDragStart();
      }}
      onDragEnd={e => { (e.currentTarget as HTMLElement).draggable = true; onDragEnd(); }}
    >
      {poem.featured && <span className="admin-featured-label">Featured</span>}
      <button type="button" className="admin-delete-btn" onClick={onDelete} title="Delete poem">×</button>
      <div className="admin-poem-image-col">
        <span className="admin-field-label">Background image</span>
        <img
          src={edit.imagePreview ?? (poem.image || PLACEHOLDER_IMAGE)}
          alt={poem.title}
          className="admin-poem-thumb"
        />
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
      </div>

      <div className="admin-poem-fields">
        <div>
          <label className="admin-field-label">Title</label>
          <input
            type="text"
            className="admin-input"
            value={edit.title}
            onChange={e => onChange({ title: e.target.value })}
          />
        </div>
        <div>
          <label className="admin-field-label">Overlay text</label>
          <textarea
            className="admin-overlay-textarea"
            value={edit.overlay}
            onChange={e => onChange({ overlay: e.target.value })}
            onClick={e => { if (e.detail === 3) { const ta = e.currentTarget; setTimeout(() => ta.select(), 0); } }}
          />
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
            className={`admin-btn${poem.featured ? ' admin-btn-featured' : ''}`}
            onClick={onToggleFeature}
            disabled={status === 'saving'}
          >
            {poem.featured ? 'Unfeature' : 'Feature'}
          </button>
          {status === 'saved' && <span className="admin-save-status">Saved</span>}
          {status === 'error' && <span className="admin-save-status" style={{ color: '#e05a5a' }}>Error saving</span>}
        </div>
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const { poems, loading, refreshPoems } = usePoemsContext();
  const [orderedPoems, setOrderedPoems] = useState<Poem[]>([]);
  const [edits, setEdits] = useState<Record<string, EditState>>({});
  const [statuses, setStatuses] = useState<Record<string, SaveStatus>>({});
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [draftIds, setDraftIds] = useState<Set<string>>(new Set());
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const initialized = useRef(false);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const prevPositions = useRef<Record<string, DOMRect> | null>(null);

  // Initialize once when live poem data loads
  useEffect(() => {
    if (initialized.current || loading) return;
    initialized.current = true;
    setOrderedPoems(poems);
    setEdits(
      Object.fromEntries(poems.map(p => [p.id, { title: p.title, overlay: p.overlay ?? '', imageFile: null, imagePreview: null }]))
    );
  }, [poems, loading]);

  // After refreshPoems: update existing poems and append any newly added ones
  useEffect(() => {
    if (!initialized.current) return;
    const map = new Map(poems.map(p => [p.id, p]));
    setOrderedPoems(prev => {
      const updated = prev.map(p => map.get(p.id) ?? p);
      const existingIds = new Set(prev.map(p => p.id));
      const added = poems.filter(p => !existingIds.has(p.id));
      return [...updated, ...added];
    });
    setEdits(prev => {
      const next = { ...prev };
      for (const p of poems) {
        if (!next[p.id]) next[p.id] = { title: p.title, overlay: p.overlay ?? '', imageFile: null, imagePreview: null };
      }
      return next;
    });
  }, [poems]);

  // FLIP animation: after orderedPoems reorders, animate cards from old positions to new
  useLayoutEffect(() => {
    const snapshots = prevPositions.current;
    if (!snapshots) return;
    prevPositions.current = null;
    for (const [id, el] of Object.entries(cardRefs.current)) {
      if (!el || !snapshots[id]) continue;
      const dy = snapshots[id].top - el.getBoundingClientRect().top;
      if (dy === 0) continue;
      el.style.transition = 'none';
      el.style.transform = `translateY(${dy}px)`;
      requestAnimationFrame(() => {
        el.style.transition = 'transform 0.35s ease';
        el.style.transform = '';
      });
    }
  }, [orderedPoems]);

  const patchEdit = (id: string, patch: Partial<EditState>) =>
    setEdits(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const setStatus = (id: string, s: SaveStatus) =>
    setStatuses(prev => ({ ...prev, [id]: s }));

  const handleSave = async (id: string) => {
    const edit = edits[id];
    if (!edit) return;
    setStatus(id, 'saving');
    try {
      let realId = id;
      if (draftIds.has(id)) {
        const created = await apiAddPoem();
        realId = created.id;
        setOrderedPoems(prev => prev.map(p => p.id === id ? { ...p, id: realId } : p));
        setEdits(prev => { const next = { ...prev, [realId]: prev[id] }; delete next[id]; return next; });
        setStatuses(prev => { const next = { ...prev, [realId]: 'saving' as SaveStatus }; delete next[id]; return next; });
        setDraftIds(prev => { const next = new Set(prev); next.delete(id); return next; });
        await apiUpdateOrder(orderedPoems.map(p => p.id === id ? realId : p.id));
      }
      let imageUrl: string | undefined;
      if (edit.imageFile) imageUrl = await apiUploadImage(realId, edit.imageFile);
      await apiUpdatePoem(realId, { title: edit.title, overlay: edit.overlay, ...(imageUrl ? { image: imageUrl } : {}) });
      patchEdit(realId, { imageFile: null, imagePreview: imageUrl ?? edit.imagePreview });
      await refreshPoems();
      setStatus(realId, 'saved');
      setTimeout(() => setStatus(realId, 'idle'), 3000);
    } catch {
      setStatus(id, 'error');
      setTimeout(() => setStatus(id, 'idle'), 4000);
    }
  };


  const handleAddPoem = () => {
    const tempId = `poem-draft-${Date.now()}`;
    const newPoem: Poem = { id: tempId, title: 'New Poem', overlay: DRAFT_OVERLAY, image: PLACEHOLDER_IMAGE };
    setOrderedPoems(prev => [newPoem, ...prev]);
    setEdits(prev => ({ ...prev, [tempId]: { title: 'New Poem', overlay: DRAFT_OVERLAY, imageFile: null, imagePreview: null } }));
    setDraftIds(prev => new Set([...prev, tempId]));
  };

  const handleDelete = async (id: string) => {
    setOrderedPoems(prev => prev.filter(p => p.id !== id));
    if (draftIds.has(id)) {
      setDraftIds(prev => { const next = new Set(prev); next.delete(id); return next; });
      return;
    }
    try {
      await apiUpdatePoem(id, { deleted: true });
      await refreshPoems();
    } catch {
      await refreshPoems();
    }
  };

  const handleToggleFeature = async (id: string) => {
    const poem = orderedPoems.find(p => p.id === id);
    if (!poem) return;
    const featured = !poem.featured;
    setOrderedPoems(prev => prev.map(p => p.id === id ? { ...p, featured } : p));
    if (draftIds.has(id)) return;
    try {
      await apiUpdatePoem(id, { featured });
    } catch {
      setOrderedPoems(prev => prev.map(p => p.id === id ? { ...p, featured: !featured } : p));
    }
  };

  const handleDrop = async (toIndex: number) => {
    if (dragIndex === null || dragIndex === toIndex) return;
    // Snapshot FIRST positions for FLIP animation
    const snapshots: Record<string, DOMRect> = {};
    for (const [id, el] of Object.entries(cardRefs.current)) {
      if (el) snapshots[id] = el.getBoundingClientRect();
    }
    prevPositions.current = snapshots;
    const next = [...orderedPoems];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(toIndex, 0, moved);
    setOrderedPoems(next);
    setDragIndex(null);
    setDropIndex(null);
    try {
      await apiUpdateOrder(next.map(p => p.id));
      refreshPoems();
    } catch {
      setOrderedPoems(orderedPoems); // revert on error
    }
  };

  return (
    <div className="admin-page">
      <Header onLogout={onLogout} />

      {loading ? (
        <p style={{ textAlign: 'center', padding: '64px 0', opacity: 0.5 }}>Loading poems…</p>
      ) : (
        <div className="admin-poem-list">
          <div className="admin-add-row">
            <button type="button" className="admin-add-btn" onClick={handleAddPoem}>+</button>
            <span className="admin-add-label">Add Poem</span>
          </div>
          {orderedPoems.map((poem, i) => (
            <div
              key={poem.id}
              ref={el => { cardRefs.current[poem.id] = el; }}
              className={`admin-card-wrapper${dropIndex === i && dragIndex !== null && dragIndex !== i ? ' drop-target' : ''}`}
              onDragOver={e => { e.preventDefault(); setDropIndex(i); }}
              onDrop={() => handleDrop(i)}
            >
              <PoemCard
                poem={poem}
                edit={edits[poem.id] ?? { title: poem.title, overlay: poem.overlay ?? '', imageFile: null, imagePreview: null }}
                onChange={patch => patchEdit(poem.id, patch)}
                onSave={() => handleSave(poem.id)}
                onToggleFeature={() => handleToggleFeature(poem.id)}
                onDelete={() => setPendingDeleteId(poem.id)}
                status={statuses[poem.id] ?? 'idle'}
                onDragStart={() => setDragIndex(i)}
                onDragEnd={() => { setDragIndex(null); setDropIndex(null); }}
                isDragging={dragIndex === i}
              />
            </div>
          ))}
        </div>
      )}

      {pendingDeleteId && (
        <div className="admin-modal-backdrop" onClick={() => setPendingDeleteId(null)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <p className="admin-modal-title">Delete poem</p>
            <p className="admin-modal-body">Are you sure you want to delete this poem?</p>
            <div className="admin-modal-actions">
              <button type="button" className="admin-btn" onClick={() => setPendingDeleteId(null)}>Cancel</button>
              <button type="button" className="admin-btn admin-btn-danger" onClick={() => { handleDelete(pendingDeleteId); setPendingDeleteId(null); }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Admin entry point ─────────────────────────────────────────────────────────

export default function Admin() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('admin_token'));
  const { refreshPoems } = usePoemsContext();

  useEffect(() => {
    return () => { refreshPoems(); };
  }, [refreshPoems]);

  const handleLogin = (t: string) => {
    localStorage.setItem('admin_token', t);
    setToken(t);
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setToken(null);
  };

  if (!token) return <LoginPage onLogin={handleLogin} />;
  return <Dashboard onLogout={handleLogout} />;
}
