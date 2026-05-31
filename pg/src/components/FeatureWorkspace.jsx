import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Home,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import { FEATURE_NAV_GROUPS, getFeature } from '../data/agentchainFeatures';
import { useFlow } from '../store/FlowContext';

export default function FeatureWorkspace() {
  const navigate = useNavigate();
  const { activeFeature, addToast } = useFlow();
  const feature = getFeature(activeFeature);
  const [activeTab, setActiveTab] = useState(feature.tabs[0]);
  const [rows, setRows] = useState(feature.rows);
  const [query, setQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState({ name: '', owner: '', status: 'Draft' });

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => Object.values(row).join(' ').toLowerCase().includes(q));
  }, [query, rows]);

  const handleCreate = () => {
    if (!draft.name.trim()) {
      addToast('Name is required', 'error');
      return;
    }
    setRows((prev) => [
      {
        name: draft.name,
        status: draft.status || 'Draft',
        owner: draft.owner || 'Current Workspace',
        updated: 'Just now',
      },
      ...prev,
    ]);
    setDraft({ name: '', owner: '', status: 'Draft' });
    setFormOpen(false);
    addToast(`${feature.title} item created`, 'success');
  };

  const deleteRow = (name) => {
    setRows((prev) => prev.filter((row) => row.name !== name));
    addToast('Item removed from local registry', 'info');
  };

  return (
    <div className="feature-shell">
      <aside className="feature-nav">
        <div className="feature-nav-intro">
          <strong>Workspace</strong>
          <span>Build, configure, operate, and govern agents.</span>
        </div>
        {FEATURE_NAV_GROUPS.map((group) => (
          <div className="feature-nav-group" key={group.title}>
            <div className="feature-nav-title">{group.title}</div>
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  className={`feature-nav-item${activeFeature === item.id ? ' active' : ''}`}
                  onClick={() => navigate(`/feature/${item.id}`)}
                >
                  <Icon size={18} />
                  <span>
                    <strong>{item.label}</strong>
                    <small>{item.help}</small>
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </aside>

      <main className="feature-main">
        <header className="feature-top">
          <div>
            <button className="feature-home" onClick={() => navigate('/dashboard')}>
              <Home size={15} /> Dashboard
            </button>
            <h2>{feature.title}</h2>
            <p>{feature.description}</p>
          </div>
          <div className="feature-actions">
            <button className="topbar-btn" onClick={() => addToast(`${feature.title} refreshed`, 'success')}>
              <RefreshCw size={15} /> Refresh
            </button>
            <button className="topbar-btn success" onClick={() => setFormOpen(true)}>
              <Plus size={15} /> {feature.primaryAction}
            </button>
          </div>
        </header>

        <div className="next-steps">
          {feature.steps.map(([title, text], index) => (
            <button className="next-step" key={title} onClick={() => setActiveTab(feature.tabs[index] || feature.tabs[0])}>
              <strong>{index + 1}</strong>
              <div>
                <span>{title}</span>
                <small>{text}</small>
              </div>
            </button>
          ))}
        </div>

        <section className="feature-tabs">
          {feature.tabs.map((tab) => (
            <button key={tab} className={activeTab === tab ? 'active' : ''} onClick={() => setActiveTab(tab)}>
              {tab}
            </button>
          ))}
        </section>

        {formOpen && (
          <section className="feature-form">
            <div>
              <h3>{feature.primaryAction}</h3>
              <p>Create a local mock registry item for this UI module. Backend wiring can attach to these shapes later.</p>
            </div>
            <div className="feature-form-grid">
              <label>
                Name
                <input value={draft.name} onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))} />
              </label>
              <label>
                Owner / Source
                <input value={draft.owner} onChange={(e) => setDraft((prev) => ({ ...prev, owner: e.target.value }))} />
              </label>
              <label>
                Status
                <select value={draft.status} onChange={(e) => setDraft((prev) => ({ ...prev, status: e.target.value }))}>
                  <option>Draft</option>
                  <option>Review</option>
                  <option>Enabled</option>
                  <option>Approved</option>
                  <option>Published</option>
                </select>
              </label>
            </div>
            <div className="feature-actions">
              <button className="topbar-btn success" onClick={handleCreate}>Create</button>
              <button className="topbar-btn" onClick={() => setFormOpen(false)}>Cancel</button>
            </div>
          </section>
        )}

        <section className="feature-card">
          <div className="feature-card-head">
            <div>
              <h3>{activeTab}</h3>
              <p>{filteredRows.length} records in this workspace.</p>
            </div>
            <label className="feature-search">
              <Search size={15} />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search registry" />
            </label>
          </div>

          <div className="feature-table">
            <div className="feature-table-row head">
              <span>Name</span>
              <span>Status</span>
              <span>Owner / Route</span>
              <span>Updated / Metric</span>
              <span>Actions</span>
            </div>
            {filteredRows.map((row) => (
              <div className="feature-table-row" key={row.name}>
                <span><strong>{row.name}</strong></span>
                <span><i className="status-dot static" />{row.status}</span>
                <span>{row.owner}</span>
                <span>{row.updated}</span>
                <span className="row-actions">
                  <button onClick={() => addToast(`${row.name} tested`, 'success')} title="Test">
                    <CheckCircle2 size={15} />
                  </button>
                  <button onClick={() => deleteRow(row.name)} title="Delete">
                    <Trash2 size={15} />
                  </button>
                </span>
              </div>
            ))}
            {filteredRows.length === 0 && (
              <div className="feature-empty">No records match this search.</div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
