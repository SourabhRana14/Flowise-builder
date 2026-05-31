import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Boxes,
  CheckCircle2,
  Download,
  Home,
  LayoutDashboard,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  PlayCircle,
  Radio,
  Rocket,
  Save,
  Share2,
  Sun,
  Trash2,
  Upload,
  Wand2,
  Workflow,
} from 'lucide-react';
import { LIFECYCLE_PHASES } from '../data/nodeDefinitions';
import { useFlow } from '../store/FlowContext';

const phaseIcons = {
  builder: Workflow,
  simulation: PlayCircle,
  deployment: Rocket,
  publisher: Radio,
  analytics: BarChart3,
};

export default function TopBar() {
  const {
    sidebarOpen,
    setSidebarOpen,
    flowName,
    setFlowName,
    theme,
    setTheme,
    activePhase,
    setActivePhase,
    saveFlow,
    shareFlow,
    publishFlow,
    clearCanvas,
    exportFlow,
    importFlow,
    runPreflight,
    previewAgent,
    autoLayoutFlow,
    nodes,
    edges,
    addToast,
    workflowValidation,
  } = useFlow();
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (file) importFlow(file);
    e.target.value = '';
  };

  const handleDeploy = () => {
    if (workflowValidation.status === 'blocked') {
      addToast(workflowValidation.errors[0] || 'Resolve workflow validation errors before deployment', 'error');
      setActivePhase('builder');
      return;
    }
    setActivePhase('deployment');
    addToast('Deployment plan opened', 'success');
  };

  const SidebarIcon = sidebarOpen ? PanelLeftClose : PanelLeftOpen;
  const ThemeIcon = theme === 'dark' ? Sun : Moon;

  return (
    <div className="topbar">
      <div className="topbar-left">
        <button className="topbar-toggle" onClick={() => navigate('/dashboard')} title="Back to dashboard">
          <Home size={17} />
        </button>
        <button className="topbar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)} id="toggle-sidebar" title="Toggle node palette">
          <SidebarIcon size={17} />
        </button>
        <input
          className="flow-name-input"
          value={flowName}
          onChange={(e) => setFlowName(e.target.value)}
          id="flow-name-input"
        />
        <div className={`topbar-status ${workflowValidation.status}`}>
          <div className="status-dot" />
          <span>{nodes.length} nodes · {edges.length} edges · {workflowValidation.status}</span>
        </div>
      </div>

      <div className="phase-tabs">
        {LIFECYCLE_PHASES.map((phase) => {
          const Icon = phaseIcons[phase.id];
          return (
            <button
              key={phase.id}
              className={`phase-tab${activePhase === phase.id ? ' active' : ''}`}
              onClick={() => setActivePhase(phase.id)}
              title={phase.title}
            >
              <Icon size={15} />
              <span>{phase.label}</span>
            </button>
          );
        })}
      </div>

      <div className="topbar-right">
        <button className="topbar-btn" onClick={runPreflight} title="Preflight validation">
          <CheckCircle2 size={15} /> Preflight
        </button>
        <button className="topbar-btn" onClick={previewAgent} title="Agent preview">
          <Wand2 size={15} /> Preview
        </button>
        <button className="topbar-btn icon-only" onClick={autoLayoutFlow} title="Auto layout">
          <LayoutDashboard size={15} />
        </button>
        <button className="topbar-btn icon-only" onClick={() => navigate('/feature/studio')} title="Feature modules">
          <Boxes size={15} />
        </button>
        <button className="topbar-btn" onClick={saveFlow} id="btn-save">
          <Save size={15} /> Save
        </button>
        <button className="topbar-btn" onClick={shareFlow} title="Share package">
          <Share2 size={15} /> Share
        </button>
        <button className="topbar-btn" onClick={exportFlow} id="btn-export">
          <Download size={15} /> Export
        </button>
        <button className="topbar-btn" onClick={() => fileInputRef.current?.click()} id="btn-import">
          <Upload size={15} /> Import
        </button>
        <input ref={fileInputRef} type="file" accept=".json,.agentic.json" onChange={handleImport} style={{ display: 'none' }} />
        <button className="topbar-btn icon-only" onClick={clearCanvas} id="btn-clear" title="Clear canvas">
          <Trash2 size={15} />
        </button>
        <button className="topbar-btn icon-only" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} title="Toggle theme">
          <ThemeIcon size={15} />
        </button>
        <button className="topbar-btn success" onClick={handleDeploy} id="btn-deploy">
          <Rocket size={15} /> Deploy
        </button>
        <button className="topbar-btn success" onClick={publishFlow} title="Publish">
          <Radio size={15} /> Publish
        </button>
      </div>
    </div>
  );
}
