import { useState } from 'react';
import { Plus, Bot } from 'lucide-react';
import { FEATURE_LIST } from '../data/agentchainFeatures';
import { useFlow } from '../store/FlowContext';
import Sidebar from './Sidebar';
import FlowCanvas from './FlowCanvas';
import PropertiesPanel from './PropertiesPanel';
import TryAgentPanel from './TryAgentPanel';
import ModelsPanel from './ModelsPanel';
import ToolsPanel from './ToolsPanel';

// Agent Name Editor Component
function AgentNameEditor() {
  const { flowName, setFlowName } = useFlow();
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(flowName);

  const handleSave = () => {
    if (tempName.trim()) {
      setFlowName(tempName.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setTempName(flowName);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <input
        type="text"
        value={tempName}
        onChange={(e) => setTempName(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        autoFocus
        style={{
          fontSize: '16px',
          fontWeight: '600',
          padding: '6px 12px',
          border: '2px solid var(--accent-primary)',
          borderRadius: '6px',
          background: 'var(--bg-card)',
          color: 'var(--text-primary)',
          outline: 'none',
          minWidth: '200px',
        }}
      />
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      style={{
        fontSize: '16px',
        fontWeight: '600',
        padding: '6px 12px',
        cursor: 'pointer',
        borderRadius: '6px',
        transition: 'background 0.2s',
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
      title="Click to edit agent name"
    >
      {flowName} ✏️
    </div>
  );
}

// Convert features to microservices format
const MICROSERVICES = FEATURE_LIST.map(feature => ({
  id: feature.id,
  name: feature.label,
  icon: feature.icon,
  description: feature.help,
  status: 'active',
  group: feature.group,
  module: feature.module,
}));

export default function MicroservicesPanel() {
  const { savedFlows, loadingFlows, loadFlow, createNewFlow, saveFlow, exportFlow, previewAgent, importFlow } = useFlow();
  const [search, setSearch] = useState('');
  const [selectedService, setSelectedService] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [canvasOpen, setCanvasOpen] = useState(false);
  const [tryAgentOpen, setTryAgentOpen] = useState(false);
  const [modelsOpen, setModelsOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);

  const filteredServices = MICROSERVICES.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(search.toLowerCase()) ||
      service.description.toLowerCase().includes(search.toLowerCase());
    const matchesGroup = selectedGroup === 'all' || service.group === selectedGroup;
    return matchesSearch && matchesGroup;
  });

  const groups = ['all', ...new Set(MICROSERVICES.map(s => s.group))];

  const handleCreateAgent = () => {
    createNewFlow();
    setCanvasOpen(true);
  };

  const handleLoadAgent = (flow) => {
    loadFlow(flow);
    setCanvasOpen(true);
    setTryAgentOpen(false);
  };

  const handleOpenTryAgent = () => {
    console.log('🚀 Opening Try Agent microservice');
    setTryAgentOpen(true);
    setCanvasOpen(false);
    setModelsOpen(false);
  };

  const handleOpenModels = () => {
    console.log('🧠 Opening Models microservice');
    setModelsOpen(true);
    setTryAgentOpen(false);
    setCanvasOpen(false);
    setToolsOpen(false);
  };

  const handleOpenTools = () => {
    console.log('🛠️ Opening Tools microservice');
    setToolsOpen(true);
    setModelsOpen(false);
    setTryAgentOpen(false);
    setCanvasOpen(false);
  };

  // If Tools is open, show Tools panel
  if (toolsOpen) {
    return <ToolsPanel />;
  }

  // If Models is open, show Models panel
  if (modelsOpen) {
    return <ModelsPanel />;
  }

  // If Try Agent is open, show Try Agent panel
  if (tryAgentOpen) {
    return <TryAgentPanel />;
  }

  // If canvas is open, show the canvas workspace
  if (canvasOpen) {
    return (
      <div className="agent-studio-workspace">
        <Sidebar />
        <div className="agent-studio-canvas">
          <div className="canvas-header">
            <button 
              className="btn-back" 
              onClick={() => setCanvasOpen(false)}
            >
              ← Back to Microservices
            </button>
            <AgentNameEditor />
            <div style={{ flex: 1 }} />
            <button className="topbar-btn success" onClick={saveFlow}>
              💾 Save
            </button>
            <button className="topbar-btn" onClick={previewAgent}>
              ▶ Run
            </button>
            <button className="topbar-btn" onClick={exportFlow}>
              📤 Export
            </button>
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            <FlowCanvas />
          </div>
        </div>
        <PropertiesPanel />
      </div>
    );
  }

  return (
    <div className="microservices-container">
      <div className="microservices-sidebar">
        <div className="microservices-header">
          <h2>Microservices</h2>
        </div>

        <div className="microservices-search">
          <input
            type="text"
            placeholder="Search services..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="microservices-groups">
          {groups.map(group => (
            <button
              key={group}
              className={`group-filter ${selectedGroup === group ? 'active' : ''}`}
              onClick={() => setSelectedGroup(group)}
            >
              {group}
            </button>
          ))}
        </div>

        <div className="microservices-list">
          {filteredServices.map(service => {
            const Icon = service.icon;
            return (
              <div
                key={service.id}
                className={`microservice-item ${selectedService?.id === service.id ? 'selected' : ''}`}
                onClick={() => setSelectedService(service)}
              >
                <div className="microservice-icon">
                  <Icon size={18} />
                </div>
                <div className="microservice-info">
                  <div className="microservice-name">{service.name}</div>
                  <div className="microservice-desc">{service.description}</div>
                </div>
                <div className={`microservice-status ${service.status}`}>
                  <div className="status-dot" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="microservices-content">
        {selectedService ? (
          <div className="microservice-details">
            <div className="microservice-details-header">
              {(() => {
                const Icon = selectedService.icon;
                return <Icon size={24} />;
              })()}
              <h3>{selectedService.name}</h3>
              <span className={`status-badge ${selectedService.status}`}>
                {selectedService.status}
              </span>
            </div>

            <div className="microservice-section">
              <h4>Description</h4>
              <p>{selectedService.module?.description || selectedService.description}</p>
            </div>

            {/* Special handling for Models */}
            {selectedService.id === 'models' && (
              <div className="microservice-section">
                <button className="btn-create-agent" onClick={handleOpenModels}>
                  <Bot size={18} />
                  Open Models Config
                </button>
                <p style={{ marginTop: '12px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                  Configure LLM providers, manage API keys, and set default models.
                </p>
              </div>
            )}

            {/* Special handling for Tools */}
            {selectedService.id === 'tools' && (
              <div className="microservice-section">
                <button className="btn-create-agent" onClick={handleOpenTools}>
                  <Bot size={18} />
                  Open Tools Config
                </button>
                <p style={{ marginTop: '12px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                  Configure external APIs, test tool execution, and manage tool registry.
                </p>
              </div>
            )}

            {/* Special handling for Try Agent */}
            {selectedService.id === 'try-agent' && (
              <div className="microservice-section">
                <button className="btn-create-agent" onClick={handleOpenTryAgent}>
                  <Bot size={18} />
                  Open Try Agent
                </button>
                <p style={{ marginTop: '12px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                  Test your agents with real conversations and see execution traces.
                </p>
              </div>
            )}

            {/* Special handling for Agent Studio */}
            {selectedService.id === 'studio' && (
              <>
                <div className="microservice-section">
                  <h4>Quick Actions</h4>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <button className="btn-create-agent" onClick={handleCreateAgent}>
                      <Plus size={18} />
                      Create New Agent
                    </button>
                    <button 
                      className="btn-secondary"
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = '.json,.agentic.json';
                        input.onchange = (e) => {
                          const file = e.target.files[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              try {
                                const data = JSON.parse(event.target.result);
                                loadFlow(data);
                                setCanvasOpen(true);
                              } catch (error) {
                                alert('Invalid workflow file');
                              }
                            };
                            reader.readAsText(file);
                          }
                        };
                        input.click();
                      }}
                    >
                      📁 Import Agent
                    </button>
                  </div>
                </div>

                {savedFlows.length > 0 && (
                  <div className="microservice-section">
                    <h4>Your Agents ({savedFlows.length})</h4>
                    <div className="agents-list">
                      {savedFlows.map((flow) => (
                        <div 
                          key={flow.id} 
                          className="agent-card"
                          onClick={() => {
                            console.log('🎯 Agent card clicked:', flow.name, 'ID:', flow.id);
                            handleLoadAgent(flow);
                          }}
                          style={{ cursor: 'pointer' }}
                        >
                          <div className="agent-card-header">
                            <div className="agent-name">{flow.name}</div>
                            <div className="agent-version">v{flow.version}</div>
                          </div>
                          <div className="agent-meta">
                            <span>{flow.nodes?.length || 0} nodes</span>
                            <span>•</span>
                            <span>{flow.edges?.length || 0} edges</span>
                            <span>•</span>
                            <span>{new Date(flow.savedAt).toLocaleDateString()}</span>
                          </div>
                          {flow.description && (
                            <div className="agent-description">{flow.description}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {loadingFlows && (
                  <div className="microservice-section">
                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>
                      Loading agents...
                    </div>
                  </div>
                )}

                {!loadingFlows && savedFlows.length === 0 && (
                  <div className="microservice-section">
                    <div style={{ 
                      textAlign: 'center', 
                      padding: '40px 20px',
                      color: 'var(--text-secondary)',
                      background: 'var(--bg-hover)',
                      borderRadius: '8px'
                    }}>
                      <Bot size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                      <p style={{ margin: 0, fontSize: '14px' }}>
                        No agents yet. Create your first agent to get started!
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}

            {selectedService.module?.steps && (
              <div className="microservice-section">
                <h4>How it Works</h4>
                <div className="steps-list">
                  {selectedService.module.steps.map((step, idx) => (
                    <div key={idx} className="step-item">
                      <div className="step-number">{idx + 1}</div>
                      <div className="step-content">
                        <div className="step-title">{step[0]}</div>
                        <div className="step-desc">{step[1]}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedService.module?.tabs && (
              <div className="microservice-section">
                <h4>Available Tabs</h4>
                <div className="tabs-list">
                  {selectedService.module.tabs.map((tab, idx) => (
                    <span key={idx} className="tab-badge">{tab}</span>
                  ))}
                </div>
              </div>
            )}

            {selectedService.module?.rows && selectedService.id !== 'studio' && (
              <div className="microservice-section">
                <h4>Recent Activity</h4>
                <div className="activity-table">
                  {selectedService.module.rows.map((row, idx) => (
                    <div key={idx} className="activity-row">
                      <div className="activity-name">{row.name}</div>
                      <div className="activity-status">{row.status}</div>
                      <div className="activity-owner">{row.owner}</div>
                      <div className="activity-updated">{row.updated}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedService.id !== 'studio' && (
              <div className="microservice-section">
                <button className="btn-primary">
                  {selectedService.module?.primaryAction || 'Configure Service'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="microservice-empty">
            <h3>Select a Microservice</h3>
            <p>Choose a service from the left panel to view details and configure</p>
          </div>
        )}
      </div>
    </div>
  );
}
