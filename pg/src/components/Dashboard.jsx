import { Moon, Plus, Sun, Workflow } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  AGENT_TEMPLATES,
  LIFECYCLE_PHASES,
} from '../data/nodeDefinitions';
import { FEATURE_LIST } from '../data/agentchainFeatures';
import { useFlow } from '../store/FlowContext';

export default function Dashboard() {
  const navigate = useNavigate();
  const {
    savedFlows,
    loadingFlows,
    loadFlow,
    createNewFlow,
    createTemplateFlow,
    theme,
    setTheme,
  } = useFlow();

  const handleLoad = (flow) => {
    loadFlow(flow);
    navigate('/studio');
  };

  const handleCreateNew = () => {
    createNewFlow();
    navigate('/studio');
  };

  const handleCreateTemplate = (id) => {
    createTemplateFlow(id);
    navigate('/studio');
  };

  const ThemeIcon = theme === 'dark' ? Sun : Moon;
  const agenticNodeCount = 9;
  const mlNodeCount = 15;

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="dashboard-logo">
          <div className="logo-icon">iP</div>
          <div>
            <h1>iProcess Agentic Builder</h1>
            <span>Agent design, simulation, deployment, publishing, and observability</span>
          </div>
        </div>
        <button className="topbar-btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} title="Toggle theme">
          <ThemeIcon size={15} /> {theme === 'dark' ? 'Light' : 'Dark'}
        </button>
      </div>

      <div className="dashboard-content">
        <div className="dashboard-top">
          <div>
            <h2>Agentic Operations</h2>
            <p>Build BRD-aligned workflows from microservice nodes, validate them, and move through the lifecycle.</p>
          </div>
          <button className="create-new-btn" onClick={handleCreateNew}>
            <Plus size={17} /> New Workflow
          </button>
        </div>

        <div className="metric-grid">
          <div className="metric-card">
            <span>Agentic Nodes</span>
            <strong>{agenticNodeCount}</strong>
            <small>N01-N09 microservices</small>
          </div>
          <div className="metric-card">
            <span>ML Pipeline Nodes</span>
            <strong>{mlNodeCount}</strong>
            <small>ML01-ML15 optional phase</small>
          </div>
          <div className="metric-card">
            <span>Saved Drafts</span>
            <strong>{loadingFlows ? '...' : savedFlows.length}</strong>
            <small>{loadingFlows ? 'Loading from backend...' : 'Versioned workflow artifacts'}</small>
          </div>
          <div className="metric-card">
            <span>Lifecycle Phases</span>
            <strong>{LIFECYCLE_PHASES.length}</strong>
            <small>Builder to dashboard feedback loop</small>
          </div>
        </div>

        <section className="dashboard-section">
          <div className="section-heading">
            <Workflow size={18} />
            <h3>Pre-built Agent Templates</h3>
          </div>
          <div className="template-grid">
            {AGENT_TEMPLATES.map((template) => (
              <button className="template-card" key={template.id} onClick={() => handleCreateTemplate(template.id)}>
                <span>{template.domain}</span>
                <strong>{template.name}</strong>
                <small>{template.description}</small>
              </button>
            ))}
          </div>
        </section>

        <section className="dashboard-section">
          <div className="section-heading">
            <Workflow size={18} />
            <h3>AgentChain Feature Modules</h3>
          </div>
          <div className="feature-module-grid">
            {FEATURE_LIST.map((feature) => {
              const Icon = feature.icon;
              return (
                <button className="feature-module-card" key={feature.id} onClick={() => navigate(`/feature/${feature.id}`)}>
                  <Icon size={18} />
                  <span>{feature.group}</span>
                  <strong>{feature.label}</strong>
                  <small>{feature.help}</small>
                </button>
              );
            })}
          </div>
        </section>

        <section className="dashboard-section">
          <div className="section-heading">
            <Workflow size={18} />
            <h3>Saved Workflow Drafts</h3>
          </div>
          {savedFlows.length === 0 ? (
            <div className="empty-dashboard">
              <h3>No workflow drafts yet</h3>
              <p>Create a blank workflow or load a template to start authoring.</p>
            </div>
          ) : (
            <div className="flows-grid">
              {savedFlows.map(flow => (
                <button className="flow-card" key={flow.id} onClick={() => handleLoad(flow)}>
                  <div className="flow-card-header">
                    <h3>{flow.name || 'Untitled Agent Workflow'}</h3>
                    <span>v{flow.version || 1}</span>
                  </div>
                  <div className="flow-card-stats">
                    <span>{flow.nodes?.length || 0} nodes</span>
                    <span>{flow.edges?.length || 0} edges</span>
                    <span>{flow.workflowJson?.validation?.status || 'draft'}</span>
                  </div>
                  <div className="flow-card-footer">
                    Saved {new Date(flow.savedAt).toLocaleString()}
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
