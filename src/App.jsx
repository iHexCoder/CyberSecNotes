import { useEffect, useMemo, useState } from 'react';
import { decryptData, encryptData } from './lib/crypto';

const STORAGE_KEY = 'cybersecnotes-vault';
const SECURITY_KEY = 'cybersecnotes-passphrase';

const categories = [
  'All',
  'Threat Intel',
  'Incident Response',
  'Vulnerability',
  'Red Team',
  'Blue Team',
  'Toolbox',
  'Checklist'
];

const defaultNotes = [
  {
    id: 'note-1',
    title: 'APT Activity Review',
    category: 'Threat Intel',
    severity: 'High',
    tags: ['APT29', 'phishing', 'ioc'],
    content:
      'Monitor newly observed domains and credential harvesting patterns. Cross-check IP reputation feeds against internal proxy logs. Review suspicious mailbox redirections observed after 21:00 UTC.',
    createdAt: '2026-10-05T13:40:00.000Z',
    updatedAt: '2026-10-05T13:40:00.000Z',
    linkedIocs: ['192.168.45.12', 'mail-secure-updates[.]com']
  },
  {
    id: 'note-2',
    title: 'Ransomware Playbook',
    category: 'Incident Response',
    severity: 'Critical',
    tags: ['ransomware', 'containment', 'forensics'],
    content:
      'Isolate affected hosts, preserve volatile evidence, block outbound C2 beacons, and validate EDR coverage before restoring services. Validate backup integrity and apply segmentation controls to reduce lateral movement.',
    createdAt: '2026-10-03T09:15:00.000Z',
    updatedAt: '2026-10-03T09:15:00.000Z',
    linkedIocs: ['sha256:9d1e..', 'cmd.exe /c regsvr32']
  },
  {
    id: 'note-3',
    title: 'Zero-Day Research Log',
    category: 'Vulnerability',
    severity: 'Medium',
    tags: ['CVE', 'webapp', 'research'],
    content:
      'Document the POST parameter injection chain and test patch conditions. Confirm impact on authentication flow and downstream session validation. Capture reproduction steps for leadership briefing.',
    createdAt: '2026-10-01T16:00:00.000Z',
    updatedAt: '2026-10-01T16:00:00.000Z',
    linkedIocs: ['/login?token', 'CVE-2026-4101']
  }
];

const severityClasses = {
  Critical: 'critical',
  High: 'high',
  Medium: 'medium',
  Low: 'low'
};

function formatDate(dateString) {
  return new Date(dateString).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function App() {
  const [notes, setNotes] = useState(defaultNotes);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNoteId, setSelectedNoteId] = useState(defaultNotes[0]?.id);
  const [showDraft, setShowDraft] = useState(false);
  const [passphrase, setPassphrase] = useState(() => localStorage.getItem(SECURITY_KEY) || 'cybersec-demo');
  const [usingEncryption, setUsingEncryption] = useState(true);
  const [draft, setDraft] = useState({
    title: '',
    category: 'Threat Intel',
    severity: 'Medium',
    tags: '',
    content: '',
    linkedIocs: ''
  });

  useEffect(() => {
    const loadSavedNotes = async () => {
      const savedVault = localStorage.getItem(STORAGE_KEY);
      if (!savedVault) return;

      try {
        const parsed = JSON.parse(savedVault);
        let nextNotes = parsed;

        if (parsed && parsed.encrypted) {
          const plain = await decryptData(parsed, passphrase || 'cybersec-demo');
          nextNotes = plain;
        }

        if (Array.isArray(nextNotes) && nextNotes.length > 0) {
          setNotes(nextNotes);
          setSelectedNoteId(nextNotes[0].id);
        }
      } catch (error) {
        console.error('Vault load failed:', error);
      }
    };

    loadSavedNotes();
  }, []);

  useEffect(() => {
    localStorage.setItem(SECURITY_KEY, passphrase);
  }, [passphrase]);

  useEffect(() => {
    const persistNotes = async () => {
      if (!notes.length) return;

      const payload = JSON.stringify(notes);

      if (usingEncryption && passphrase.trim()) {
        const encrypted = await encryptData(notes, passphrase);
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ encrypted: true, ...encrypted }));
      } else {
        localStorage.setItem(STORAGE_KEY, payload);
      }
    };

    persistNotes();
  }, [notes, passphrase, usingEncryption]);

  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      const matchesCategory = selectedCategory === 'All' || note.category === selectedCategory;
      const haystack = `${note.title} ${note.content} ${note.tags.join(' ')} ${note.category}`.toLowerCase();
      const matchesSearch = haystack.includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [notes, searchTerm, selectedCategory]);

  const selectedNote = filteredNotes.find((note) => note.id === selectedNoteId) || filteredNotes[0] || notes[0];

  useEffect(() => {
    if (!filteredNotes.length) return;
    if (!selectedNote || !filteredNotes.some((note) => note.id === selectedNoteId)) {
      setSelectedNoteId(filteredNotes[0].id);
    }
  }, [filteredNotes, selectedNote, selectedNoteId]);

  const handleNewNote = () => {
    if (!draft.title.trim() || !draft.content.trim()) return;

    const nextNote = {
      id: `note-${Date.now()}`,
      title: draft.title.trim(),
      category: draft.category,
      severity: draft.severity,
      tags: draft.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      content: draft.content.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      linkedIocs: draft.linkedIocs
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    };

    const nextNotes = [nextNote, ...notes];
    setNotes(nextNotes);
    setSelectedNoteId(nextNote.id);
    setDraft({
      title: '',
      category: 'Threat Intel',
      severity: 'Medium',
      tags: '',
      content: '',
      linkedIocs: ''
    });
    setShowDraft(false);
  };

  const totalCritical = notes.filter((note) => note.severity === 'Critical').length;
  const totalHigh = notes.filter((note) => note.severity === 'High').length;
  const categoriesCount = categories.length - 1;

  return (
    <div className="app-shell">
      <aside className="sidebar panel">
        <div className="brand-block">
          <div className="brand-mark">C</div>
          <div>
            <p className="eyebrow">SECURITY OPS</p>
            <h1>CyberSecNotes</h1>
          </div>
        </div>

        <div className="vault-box">
          <label htmlFor="passphrase">Vault Passphrase</label>
          <input
            id="passphrase"
            type="password"
            value={passphrase}
            onChange={(event) => setPassphrase(event.target.value)}
            placeholder="Enter a secure passphrase"
          />
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={usingEncryption}
              onChange={() => setUsingEncryption((prev) => !prev)}
            />
            <span>Encrypt local vault</span>
          </label>
        </div>

        <nav className="category-nav" aria-label="Categories">
          {categories.map((category) => (
            <button
              key={category}
              className={category === selectedCategory ? 'nav-item active' : 'nav-item'}
              onClick={() => setSelectedCategory(category)}
            >
              <span>{category}</span>
              <span className="count-badge">
                {category === 'All' ? notes.length : notes.filter((note) => note.category === category).length}
              </span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="content-panel">
        <header className="topbar panel">
          <div>
            <p className="eyebrow">Threat awareness workspace</p>
            <h2>Security Notebook</h2>
          </div>
          <div className="topbar-actions">
            <button className="ghost-button" onClick={() => setShowDraft(true)}>
              + New Note
            </button>
            <button
              className="primary-button"
              onClick={() => {
                const payload = JSON.stringify(notes, null, 2);
                const blob = new Blob([payload], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const anchor = document.createElement('a');
                anchor.href = url;
                anchor.download = 'cybersecnotes-export.json';
                anchor.click();
                URL.revokeObjectURL(url);
              }}
            >
              Export JSON
            </button>
          </div>
        </header>

        <section className="stats-grid">
          <div className="stat-card panel">
            <p>Total Notes</p>
            <h3>{notes.length}</h3>
          </div>
          <div className="stat-card panel">
            <p>Critical</p>
            <h3>{totalCritical}</h3>
          </div>
          <div className="stat-card panel">
            <p>High Priority</p>
            <h3>{totalHigh}</h3>
          </div>
          <div className="stat-card panel">
            <p>Categories</p>
            <h3>{categoriesCount}</h3>
          </div>
        </section>

        <section className="workspace-grid">
          <div className="notes-column panel">
            <div className="search-row">
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search notes, tags, or IOCs..."
              />
            </div>

            <div className="notes-list">
              {filteredNotes.map((note) => (
                <article
                  key={note.id}
                  className={selectedNote?.id === note.id ? 'note-card active' : 'note-card'}
                  onClick={() => setSelectedNoteId(note.id)}
                >
                  <div className="note-card-top">
                    <span className={`pill ${severityClasses[note.severity] || 'low'}`}>{note.severity}</span>
                    <span className="small-muted">{note.category}</span>
                  </div>
                  <h4>{note.title}</h4>
                  <p>{note.content.slice(0, 110)}{note.content.length > 110 ? '...' : ''}</p>
                  <div className="tags-row">
                    {note.tags.slice(0, 3).map((tag) => (
                      <span key={`${note.id}-${tag}`} className="tag-chip">#{tag}</span>
                    ))}
                  </div>
                  <div className="note-meta">
                    <span>{formatDate(note.updatedAt)}</span>
                    <span>{note.linkedIocs.length} IOC(s)</span>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="detail-column panel">
            {selectedNote ? (
              <>
                <div className="detail-header">
                  <div>
                    <p className="eyebrow">{selectedNote.category}</p>
                    <h3>{selectedNote.title}</h3>
                  </div>
                  <span className={`pill ${severityClasses[selectedNote.severity] || 'low'}`}>
                    {selectedNote.severity}
                  </span>
                </div>

                <div className="detail-tags">
                  {selectedNote.tags.map((tag) => (
                    <span key={`${selectedNote.id}-tag-${tag}`} className="tag-chip" >#{tag}</span>
                  ))}
                </div>

                <div className="detail-body">
                  <p>{selectedNote.content}</p>
                </div>

                <div className="evidence-box">
                  <h4>Linked IOCs</h4>
                  <ul>
                    {selectedNote.linkedIocs.map((ioc) => (
                      <li key={`${selectedNote.id}-${ioc}`}>{ioc}</li>
                    ))}
                  </ul>
                </div>

                <div className="detail-meta">
                  <span>Created: {formatDate(selectedNote.createdAt)}</span>
                  <span>Updated: {formatDate(selectedNote.updatedAt)}</span>
                </div>
              </>
            ) : (
              <div className="empty-state">
                <p>No notes matched your current filters.</p>
              </div>
            )}
          </div>
        </section>
      </main>

      {showDraft && (
        <div className="modal-backdrop" onClick={() => setShowDraft(false)}>
          <div className="modal panel" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>Create Security Note</h3>
              <button className="close-button" onClick={() => setShowDraft(false)}>×</button>
            </div>

            <div className="draft-grid">
              <label>
                Title
                <input
                  value={draft.title}
                  onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                  placeholder="Credential phishing campaign"
                />
              </label>

              <label>
                Category
                <select
                  value={draft.category}
                  onChange={(event) => setDraft({ ...draft, category: event.target.value })}
                >
                  {categories.filter((cat) => cat !== 'All').map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </label>

              <label>
                Severity
                <select
                  value={draft.severity}
                  onChange={(event) => setDraft({ ...draft, severity: event.target.value })}
                >
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </label>

              <label>
                Tags
                <input
                  value={draft.tags}
                  onChange={(event) => setDraft({ ...draft, tags: event.target.value })}
                  placeholder="phishing, azure, user-account"
                />
              </label>

              <label className="full-span">
                Linked IOCs
                <input
                  value={draft.linkedIocs}
                  onChange={(event) => setDraft({ ...draft, linkedIocs: event.target.value })}
                  placeholder="smtp.domain[.]org, 192.168.10.7"
                />
              </label>

              <label className="full-span">
                Notes
                <textarea
                  rows="6"
                  value={draft.content}
                  onChange={(event) => setDraft({ ...draft, content: event.target.value })}
                  placeholder="Describe the observation, impact, and action taken..."
                />
              </label>
            </div>

            <div className="modal-actions">
              <button className="ghost-button" onClick={() => setShowDraft(false)}>Cancel</button>
              <button className="primary-button" onClick={handleNewNote}>Save Note</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
