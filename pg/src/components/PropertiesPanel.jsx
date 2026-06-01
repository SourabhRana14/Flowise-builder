import { useFlow } from '../store/FlowContext';
import { useState, useEffect } from 'react';

export default function PropertiesPanel() {
  const { selectedNode, setSelectedNode, updateNodeData, deleteNode, duplicateNode } = useFlow();
  const [configuredProviders, setConfiguredProviders] = useState([]);
  const [availableModels, setAvailableModels] = useState([]);
  const [availableTools, setAvailableTools] = useState([]);

  // Load configured providers from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('llm_providers');
      
      if (saved) {
        const providers = JSON.parse(saved);
        const enabled = providers.filter(p => p.enabled);
        setConfiguredProviders(enabled);
        
        // Extract all available models
        const models = enabled.flatMap(p => 
          p.availableModels.map(model => ({
            provider: p.name,
            model: model,
            value: `${p.templateId}:${model}`
          }))
        );
        setAvailableModels(models);
        
        // Auto-fix: If selected node has invalid provider, set to first available
        if (selectedNode && selectedNode.data?.nodeId === 'N02' && enabled.length > 0) {
          const currentProvider = selectedNode.data?.values?.provider;
          const providerExists = enabled.some(p => p.name === currentProvider);
          
          if (!providerExists) {
            updateNodeData(selectedNode.id, 'provider', enabled[0].name);
            
            // Also set first model of that provider
            if (enabled[0].availableModels.length > 0) {
              updateNodeData(selectedNode.id, 'model', enabled[0].availableModels[0]);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading providers:', error);
    }
  }, [selectedNode, updateNodeData]);

  // Load available tools from backend
  useEffect(() => {
    const fetchTools = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/tools');
        const data = await response.json();
        // Backend returns array directly, not wrapped in {tools: [...]}
        const tools = Array.isArray(data) ? data : [];
        console.log('📦 Loaded tools from backend:', tools);
        setAvailableTools(tools);
      } catch (error) {
        console.error('Error loading tools:', error);
        setAvailableTools([]);
      }
    };

    fetchTools();
  }, []);

  if (!selectedNode) {
    return <div className="properties-panel hidden" />;
  }

  const { data, id } = selectedNode;

  const renderField = (field) => {
    const value = data.values?.[field.key] ?? field.default ?? '';

    // Special handling for toolSet field in N04 Tools node
    if (field.key === 'toolSet' && data.nodeId === 'N04') {
      const selectedTools = value ? value.split(',').map(t => t.trim()).filter(Boolean) : [];
      
      console.log('🔧 Tool selection debug:', {
        rawValue: value,
        selectedTools,
        availableTools: availableTools.length,
        availableToolsList: availableTools
      });
      
      const toggleTool = (toolId) => {
        const newSelection = selectedTools.includes(toolId)
          ? selectedTools.filter(id => id !== toolId)
          : [...selectedTools, toolId];
        updateNodeData(id, field.key, newSelection.join(', '));
      };

      return (
        <div className="tools-multiselect">
          {availableTools.length === 0 ? (
            <div>
              <div style={{ padding: '12px', background: 'rgba(251,191,36,0.1)', borderRadius: '6px', fontSize: '12px', color: 'var(--warning)' }}>
                ⚠️ No tools available. Add tools in the Tools panel first.
              </div>
              {selectedTools.length > 0 && (
                <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(59,130,246,0.1)', borderRadius: '6px', fontSize: '11px', color: 'var(--primary)' }}>
                  ℹ️ {selectedTools.length} tool(s) were previously selected but may not be available anymore.
                  <button 
                    onClick={() => updateNodeData(id, field.key, '')}
                    style={{ marginLeft: '8px', padding: '4px 8px', fontSize: '10px', background: 'rgba(239,68,68,0.2)', color: 'var(--error)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Clear Selection
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="tools-list">
                {availableTools.map(tool => (
                  <label key={tool.id} className="tool-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedTools.includes(tool.id)}
                      onChange={() => toggleTool(tool.id)}
                    />
                    <div className="tool-info">
                      <span className="tool-name">{tool.name}</span>
                      <span className="tool-desc">{tool.description}</span>
                    </div>
                  </label>
                ))}
              </div>
              {selectedTools.length > 0 && (
                <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>✅ {selectedTools.length} tool(s) selected</span>
                  <button 
                    onClick={() => updateNodeData(id, field.key, '')}
                    style={{ padding: '4px 8px', fontSize: '10px', background: 'rgba(239,68,68,0.1)', color: 'var(--error)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Clear All
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      );
    }

    if (field.type === 'checkbox') {
      return (
        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => updateNodeData(id, field.key, e.target.checked)}
          />
          <span>{field.label}</span>
        </label>
      );
    }

    if (field.type === 'select') {
      // Dynamic provider dropdown for LLM nodes
      if (field.key === 'provider' && data.nodeId === 'N02') {
        const providerOptions = configuredProviders.length > 0 
          ? configuredProviders.map(p => p.name)
          : field.options || [];
        
        return (
          <div>
            <select
              value={value}
              onChange={(e) => updateNodeData(id, field.key, e.target.value)}
            >
              {providerOptions.length === 0 && (
                <option value="">No providers configured</option>
              )}
              {providerOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            {configuredProviders.length === 0 && (
              <small style={{ color: 'var(--warning)', fontSize: '11px', display: 'block', marginTop: '4px' }}>
                ⚠️ Configure providers in Models panel first
              </small>
            )}
            {configuredProviders.length > 0 && (
              <small style={{ color: 'var(--text-secondary)', fontSize: '11px', display: 'block', marginTop: '4px' }}>
                ✅ {configuredProviders.length} provider(s) configured
              </small>
            )}
          </div>
        );
      }

      // Dynamic model dropdown for LLM nodes
      if (field.key === 'model' && data.nodeId === 'N02') {
        const selectedProvider = data.values?.provider;
        const provider = configuredProviders.find(p => p.name === selectedProvider);
        const modelOptions = provider?.availableModels || [];
        
        return (
          <div>
            <select
              value={value}
              onChange={(e) => updateNodeData(id, field.key, e.target.value)}
              disabled={!selectedProvider}
            >
              {!selectedProvider && <option value="">Select provider first</option>}
              {selectedProvider && modelOptions.length === 0 && (
                <option value="">No models available</option>
              )}
              {modelOptions.map(model => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
            {selectedProvider && modelOptions.length > 0 && (
              <small style={{ color: 'var(--text-secondary)', fontSize: '11px', display: 'block', marginTop: '4px' }}>
                {modelOptions.length} models available
              </small>
            )}
          </div>
        );
      }

      // Default select rendering
      return (
        <select
          value={value}
          onChange={(e) => updateNodeData(id, field.key, e.target.value)}
        >
          {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      );
    }

    if (field.type === 'textarea') {
      return (
        <textarea
          value={value}
          onChange={(e) => updateNodeData(id, field.key, e.target.value)}
          placeholder={field.default || `Enter ${field.label.toLowerCase()}...`}
          rows={4}
        />
      );
    }

    return (
      <input
        type={field.type === 'password' ? 'password' : field.type === 'number' ? 'number' : 'text'}
        value={value}
        onChange={(e) => updateNodeData(id, field.key, e.target.value)}
        placeholder={field.default || `Enter ${field.label.toLowerCase()}...`}
      />
    );
  };

  return (
    <div className="properties-panel">
      <div className="panel-header">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>{data.icon}</span> {data.nodeId} {data.label.replace(`${data.nodeId} `, '')}
        </h3>
        <button className="panel-close" onClick={() => setSelectedNode(null)}>✕</button>
      </div>

      <div className="panel-content">
        <div className="panel-section">
          <div className="panel-section-title">Node Info</div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <span className="node-badge" style={{ background: `${data.color}20`, color: data.color }}>
              {data.priority}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              ID: {id.slice(0, 8)}
            </span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {data.desc}
          </p>
        </div>

        <div className="panel-section">
          <div className="panel-section-title">Service Contract</div>
          <div className="contract-grid">
            <div>
              <span>Stage</span>
              <strong>{data.stage}</strong>
            </div>
            <div>
              <span>Input From</span>
              <strong>{data.inputFrom}</strong>
            </div>
            <div>
              <span>Output To</span>
              <strong>{data.outputTo}</strong>
            </div>
          </div>
        </div>

        <div className="panel-section">
          <div className="panel-section-title">Capabilities</div>
          <ul className="capability-list">
            {data.capabilities?.map((capability) => (
              <li key={capability}>{capability}</li>
            ))}
          </ul>
        </div>

        <div className="panel-section">
          <div className="panel-section-title">Configuration</div>
          {data.fields?.map(field => (
            <div className="panel-field" key={field.key}>
              {field.type !== 'checkbox' && (
                <label>
                  {field.label} {field.required && <span style={{ color: 'var(--error)' }}>*</span>}
                </label>
              )}
              {renderField(field)}
            </div>
          ))}
          {(!data.fields || data.fields.length === 0) && (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              No configuration needed for this node.
            </p>
          )}
        </div>

        <div className="panel-section">
          <div className="panel-section-title">Actions</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="topbar-btn" onClick={() => duplicateNode(id)} style={{ flex: 1 }}>
              📋 Duplicate
            </button>
            <button className="topbar-btn" onClick={() => { deleteNode(id); setSelectedNode(null); }}
              style={{ flex: 1, borderColor: 'rgba(239,68,68,0.3)', color: 'var(--error)' }}>
              🗑️ Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
