'use client';

import { useState, useEffect, useCallback } from 'react';

/* ─── Types ─────────────────────────────────────────── */
interface EmailConfig {
  id: string;
  emailAddress: string;
  connectionType: string;
  host?: string;
  port?: number;
  secure?: boolean;
  username: string;
  createdAt: string;
}

interface PdfAttachment {
  id: string;
  fromAddress: string;
  subject: string;
  dateReceived: string;
  attachmentFileName: string;
  savedPath: string;
  fileSizeBytes?: number;
  createdAt: string;
}

interface AlertState {
  type: 'success' | 'error' | 'info';
  message: string;
}

const CONNECTION_TYPES = ['IMAP', 'POP3', 'GMAIL', 'OUTLOOK'];

const TYPE_ICONS: Record<string, string> = {
  IMAP: '📡',
  POP3: '📬',
  GMAIL: '📧',
  OUTLOOK: '📮',
};

const TYPE_DEFAULTS: Record<string, { host: string; port: number }> = {
  GMAIL:   { host: 'imap.gmail.com',          port: 993 },
  OUTLOOK: { host: 'outlook.office365.com',   port: 993 },
  IMAP:    { host: '',                          port: 993 },
  POP3:    { host: '',                          port: 995 },
};

const defaultForm = {
  emailAddress: '',
  connectionType: 'IMAP',
  host: '',
  port: '993',
  secure: true,
  username: '',
  password: '',
};

function formatBytes(bytes?: number) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/* ─── Main Page ─────────────────────────────────────── */
export default function Home() {
  const [configs, setConfigs] = useState<EmailConfig[]>([]);
  const [attachments, setAttachments] = useState<PdfAttachment[]>([]);
  const [form, setForm] = useState(defaultForm);
  const [editConfig, setEditConfig] = useState<EmailConfig | null>(null);
  const [editForm, setEditForm] = useState(defaultForm);

  const [loadingConfigs, setLoadingConfigs] = useState(false);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [checkingInbox, setCheckingInbox] = useState<string | null>(null);

  const [alert, setAlert] = useState<AlertState | null>(null);
  const [editAlert, setEditAlert] = useState<AlertState | null>(null);

  /* Auto-dismiss alert */
  useEffect(() => {
    if (alert) {
      const t = setTimeout(() => setAlert(null), 5000);
      return () => clearTimeout(t);
    }
  }, [alert]);

  /* ── Fetch data ─────────────────────── */
  const fetchConfigs = useCallback(async () => {
    setLoadingConfigs(true);
    try {
      const res = await fetch('/api/email-ingestion');
      const json = await res.json();
      if (json.success) setConfigs(json.data);
    } catch {
      setAlert({ type: 'error', message: 'Failed to load configurations' });
    } finally {
      setLoadingConfigs(false);
    }
  }, []);

  const fetchAttachments = useCallback(async () => {
    setLoadingAttachments(true);
    try {
      const res = await fetch('/api/attachments');
      const json = await res.json();
      if (json.success) setAttachments(json.data);
    } catch {
      // silent
    } finally {
      setLoadingAttachments(false);
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
    fetchAttachments();
  }, [fetchConfigs, fetchAttachments]);

  /* ── Handle connection type change ──── */
  function handleTypeChange(type: string, isEdit = false) {
    const defaults = TYPE_DEFAULTS[type] || { host: '', port: 993 };
    if (isEdit) {
      setEditForm(prev => ({
        ...prev,
        connectionType: type,
        host: ['GMAIL', 'OUTLOOK'].includes(type) ? defaults.host : prev.host,
        port: String(defaults.port),
      }));
    } else {
      setForm(prev => ({
        ...prev,
        connectionType: type,
        host: ['GMAIL', 'OUTLOOK'].includes(type) ? defaults.host : prev.host,
        port: String(defaults.port),
      }));
    }
  }

  /* ── Add new config ─────────────────── */
  async function handleAddConfig(e: React.FormEvent) {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const res = await fetch('/api/email-ingestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          port: parseInt(form.port),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setAlert({ type: 'success', message: `✅ Configuration for ${form.emailAddress} saved!` });
        setForm(defaultForm);
        fetchConfigs();
      } else {
        setAlert({ type: 'error', message: json.error || 'Failed to save' });
      }
    } catch {
      setAlert({ type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setSavingConfig(false);
    }
  }

  /* ── Delete config ──────────────────── */
  async function handleDelete(id: string, email: string) {
    if (!confirm(`Delete configuration for ${email}?`)) return;
    try {
      const res = await fetch(`/api/email-ingestion/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setAlert({ type: 'success', message: `${json.message}` });
        fetchConfigs();
        fetchAttachments(); // Refresh PDFs in case they were deleted along with the config
      } else {
        setAlert({ type: 'error', message: json.error || 'Delete failed' });
      }
    } catch {
      setAlert({ type: 'error', message: 'Network error' });
    }
  }

  /* ── Delete individual PDF ──────────── */
  async function handleDeleteAttachment(id: string, filename: string) {
    if (!confirm(`Permanently delete ${filename}?`)) return;
    try {
      const res = await fetch(`/api/attachments/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setAlert({ type: 'success', message: `Successfully deleted ${filename}` });
        fetchAttachments();
      } else {
        setAlert({ type: 'error', message: json.error || 'Delete failed' });
      }
    } catch {
      setAlert({ type: 'error', message: 'Network error' });
    }
  }

  /* ── View individual PDF ────────────── */
  function handleViewAttachment(id: string) {
    window.open(`/api/attachments/${id}/view`, '_blank');
  }

  /* ── Open edit modal ────────────────── */
  function openEdit(cfg: EmailConfig) {
    setEditConfig(cfg);
    setEditForm({
      emailAddress: cfg.emailAddress,
      connectionType: cfg.connectionType,
      host: cfg.host || '',
      port: String(cfg.port || 993),
      secure: cfg.secure ?? true,
      username: cfg.username,
      password: '',
    });
    setEditAlert(null);
  }

  /* ── Save edit ──────────────────────── */
  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editConfig) return;
    setSavingConfig(true);
    try {
      const payload: any = { ...editForm, port: parseInt(editForm.port) };
      if (!editForm.password) delete payload.password;

      const res = await fetch(`/api/email-ingestion/${editConfig.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        setEditAlert({ type: 'success', message: 'Configuration updated successfully!' });
        setTimeout(() => {
          setEditConfig(null);
          fetchConfigs();
        }, 1200);
      } else {
        setEditAlert({ type: 'error', message: json.error || 'Update failed' });
      }
    } catch {
      setEditAlert({ type: 'error', message: 'Network error' });
    } finally {
      setSavingConfig(false);
    }
  }

  /* ── Check inbox ────────────────────── */
  async function handleCheckInbox(cfg: EmailConfig) {
    setCheckingInbox(cfg.id);
    setAlert({ type: 'info', message: `🔍 Connecting to ${cfg.emailAddress}…` });
    try {
      const res = await fetch('/api/email-ingestion/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configId: cfg.id }),
      });
      const json = await res.json();
      if (json.success) {
        setAlert({
          type: json.downloadedCount > 0 ? 'success' : 'info',
          message: json.message,
        });
        fetchAttachments();
      } else {
        setAlert({ type: 'error', message: json.error || json.message || 'Inbox check failed' });
      }
    } catch {
      setAlert({ type: 'error', message: 'Network error while checking inbox' });
    } finally {
      setCheckingInbox(null);
    }
  }

  /* ── Render ─────────────────────────── */
  return (
    <div className="app-container">
      {/* ── Header ────────────────────── */}
      <header className="app-header">
        <div className="app-logo">
          <div className="logo-icon">📥</div>
          <div>
            <div className="app-title">Email PDF Ingestion</div>
            <div className="app-subtitle">Automated PDF retrieval from email inboxes</div>
          </div>
        </div>
        <div className="header-badge">
          <span className="status-dot" />
          System Active
        </div>
      </header>

      {/* ── Stats Bar ─────────────────── */}
      <div className="stats-bar">
        <div className="stat-card">
          <div className="stat-icon indigo">📡</div>
          <div>
            <div className="stat-label">Email Accounts</div>
            <div className="stat-value">{configs.length}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">📄</div>
          <div>
            <div className="stat-label">PDFs Downloaded</div>
            <div className="stat-value">{attachments.length}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple">💾</div>
          <div>
            <div className="stat-label">Total Size</div>
            <div className="stat-value">
              {formatBytes(attachments.reduce((s, a) => s + (a.fileSizeBytes || 0), 0))}
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon amber">🕒</div>
          <div>
            <div className="stat-label">Last Scanned</div>
            <div className="stat-value" style={{ fontSize: 13 }}>
              {attachments[0] ? formatDate(attachments[0].createdAt) : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* ── Global Alert ──────────────── */}
      {alert && (
        <div className={`alert alert-${alert.type}`}>
          <span className="alert-icon">
            {alert.type === 'success' ? '✅' : alert.type === 'error' ? '❌' : 'ℹ️'}
          </span>
          <span>{alert.message}</span>
        </div>
      )}

      {/* ── Main Grid ─────────────────── */}
      <div className="main-grid" style={{ marginTop: 32 }}>
        {/* ── Add Config Card ──── */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <span className="card-title-icon">➕</span>
              Add Email Configuration
            </div>
          </div>

          <form onSubmit={handleAddConfig}>
            <div className="form-grid">
              <div className="form-group full">
                <label className="form-label">Email Address <span>*</span></label>
                <input
                  id="email-address-input"
                  className="form-input"
                  type="email"
                  placeholder="you@example.com"
                  value={form.emailAddress}
                  onChange={e => setForm(p => ({ ...p, emailAddress: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Connection Type <span>*</span></label>
                <select
                  id="connection-type-select"
                  className="form-select"
                  value={form.connectionType}
                  onChange={e => handleTypeChange(e.target.value)}
                >
                  {CONNECTION_TYPES.map(t => (
                    <option key={t} value={t}>{TYPE_ICONS[t]} {t}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Host</label>
                <input
                  id="host-input"
                  className="form-input"
                  placeholder={
                    form.connectionType === 'GMAIL' ? 'imap.gmail.com' :
                    form.connectionType === 'OUTLOOK' ? 'outlook.office365.com' :
                    'mail.example.com'
                  }
                  value={form.host}
                  onChange={e => setForm(p => ({ ...p, host: e.target.value }))}
                  disabled={['GMAIL', 'OUTLOOK'].includes(form.connectionType)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Username <span>*</span></label>
                <input
                  id="username-input"
                  className="form-input"
                  placeholder="your@email.com"
                  value={form.username}
                  onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password / App Token <span>*</span></label>
                <input
                  id="password-input"
                  className="form-input"
                  type="password"
                  placeholder="••••••••••••"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Port</label>
                <input
                  id="port-input"
                  className="form-input"
                  type="number"
                  placeholder="993"
                  value={form.port}
                  onChange={e => setForm(p => ({ ...p, port: e.target.value }))}
                />
              </div>

              <div className="form-group full form-actions">
                <button
                  id="save-config-btn"
                  className="btn btn-primary"
                  type="submit"
                  disabled={savingConfig}
                >
                  {savingConfig ? <span className="spinner" /> : '💾'}
                  {savingConfig ? 'Saving…' : 'Save Configuration'}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setForm(defaultForm)}
                >
                  Clear
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* ── Config List Card ──── */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <span className="card-title-icon">📋</span>
              Configured Emails
            </div>
            <span className="card-count">{configs.length}</span>
          </div>

          {loadingConfigs ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              <div className="spinner" style={{ margin: '0 auto 12px', width: 24, height: 24 }} />
              Loading…
            </div>
          ) : configs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <div className="empty-text">No email accounts configured yet.<br />Add one on the left to get started.</div>
            </div>
          ) : (
            <div className="config-list">
              {configs.map(cfg => (
                <div key={cfg.id} className="config-item">
                  <div className="config-avatar">
                    {TYPE_ICONS[cfg.connectionType] || '📧'}
                  </div>
                  <div className="config-info">
                    <div className="config-email" title={cfg.emailAddress}>
                      {cfg.emailAddress}
                    </div>
                    <div className="config-meta">
                      {cfg.username} · {cfg.host || cfg.connectionType}
                    </div>
                  </div>
                  <span className={`config-type-badge badge-${cfg.connectionType.toLowerCase()}`}>
                    {cfg.connectionType}
                  </span>
                  <div className="config-actions">
                    <button
                      id={`check-inbox-${cfg.id}`}
                      className="btn btn-success btn-sm"
                      onClick={() => handleCheckInbox(cfg)}
                      disabled={checkingInbox !== null}
                      title="Scan inbox for PDFs"
                    >
                      {checkingInbox === cfg.id ? (
                        <span className="spinner" style={{ width: 12, height: 12 }} />
                      ) : '🔍'}
                    </button>
                    <button
                      id={`edit-${cfg.id}`}
                      className="btn btn-ghost btn-sm"
                      onClick={() => openEdit(cfg)}
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button
                      id={`delete-${cfg.id}`}
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDelete(cfg.id, cfg.emailAddress)}
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Downloaded PDFs Table ───────── */}
      <div className="attachments-section">
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <span className="card-title-icon">📂</span>
              Downloaded PDF Attachments
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span className="card-count">{attachments.length} files</span>
              <button
                id="refresh-attachments-btn"
                className="btn btn-ghost btn-sm"
                onClick={fetchAttachments}
                disabled={loadingAttachments}
              >
                {loadingAttachments ? <span className="spinner" style={{ width: 12, height: 12 }} /> : '🔄'}
                Refresh
              </button>
            </div>
          </div>

          {attachments.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📄</div>
              <div className="empty-text">
                No PDF attachments downloaded yet.<br />
                Configure an email account and click <strong>🔍</strong> to scan.
              </div>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>File Name</th>
                    <th>From</th>
                    <th>Subject</th>
                    <th>Date Received</th>
                    <th>Size</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {attachments.map(att => (
                    <tr key={att.id}>
                      <td>
                        <span className="file-badge">
                          📄 {att.attachmentFileName}
                        </span>
                      </td>
                      <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {att.fromAddress}
                      </td>
                      <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {att.subject}
                      </td>
                      <td>{formatDate(att.dateReceived)}</td>
                      <td>{formatBytes(att.fileSizeBytes)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button 
                            className="btn btn-primary btn-sm"
                            style={{ background: 'var(--indigo-600)' }}
                            onClick={() => handleViewAttachment(att.id)}
                            title="Open and View PDF"
                          >
                            👁️
                          </button>
                          <button 
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDeleteAttachment(att.id, att.attachmentFileName)}
                            title="Permanently delete this PDF"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Edit Modal ─────────────────── */}
      {editConfig && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setEditConfig(null); }}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">✏️ Edit Configuration</div>
              <button className="modal-close" onClick={() => setEditConfig(null)}>✕</button>
            </div>

            <form onSubmit={handleEditSave}>
              <div className="form-grid">
                <div className="form-group full">
                  <label className="form-label">Email Address</label>
                  <input
                    id="edit-email-address"
                    className="form-input"
                    type="email"
                    value={editForm.emailAddress}
                    onChange={e => setEditForm(p => ({ ...p, emailAddress: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Connection Type</label>
                  <select
                    id="edit-connection-type"
                    className="form-select"
                    value={editForm.connectionType}
                    onChange={e => handleTypeChange(e.target.value, true)}
                  >
                    {CONNECTION_TYPES.map(t => (
                      <option key={t} value={t}>{TYPE_ICONS[t]} {t}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Host</label>
                  <input
                    id="edit-host"
                    className="form-input"
                    value={editForm.host}
                    onChange={e => setEditForm(p => ({ ...p, host: e.target.value }))}
                    disabled={['GMAIL', 'OUTLOOK'].includes(editForm.connectionType)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Username</label>
                  <input
                    id="edit-username"
                    className="form-input"
                    value={editForm.username}
                    onChange={e => setEditForm(p => ({ ...p, username: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">New Password (leave blank to keep)</label>
                  <input
                    id="edit-password"
                    className="form-input"
                    type="password"
                    placeholder="••••••••"
                    value={editForm.password}
                    onChange={e => setEditForm(p => ({ ...p, password: e.target.value }))}
                  />
                </div>

                <div className="form-group full form-actions">
                  <button
                    id="edit-save-btn"
                    className="btn btn-primary"
                    type="submit"
                    disabled={savingConfig}
                  >
                    {savingConfig ? <span className="spinner" /> : '💾'}
                    {savingConfig ? 'Saving…' : 'Update Configuration'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setEditConfig(null)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>

            {editAlert && (
              <div className={`alert alert-${editAlert.type}`}>
                <span className="alert-icon">
                  {editAlert.type === 'success' ? '✅' : '❌'}
                </span>
                {editAlert.message}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
