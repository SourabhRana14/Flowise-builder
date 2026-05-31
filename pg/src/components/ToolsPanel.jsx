import { useState, useEffect } from 'react';
import { Plus, Trash2, Play, Search, Globe, Package, TestTube } from 'lucide-react';
import { apiClient } from '../services/api';

export default function ToolsPanel() {
  const [activeTab, setActiveTab] = useState('http');
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTool, setSelectedTool] = useState(null);
  
  // HTTP Tab State
  const [httpForm, setHttpForm] = useState({
    name: '',
    description: '',
    url: '',
    method: 'GET',
    headers: [{ key: '', value: '' }],
    body: '{}',
    authType: 'none',
    authValue: ''
  });

  // Test Tab State
  const [testToolId, setTestToolId] = useState('');
  const [testParams, setTestParams] = useState('{}');
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);

  // Registry - Pre-built tools
  const registryTools = [
    {
      id: 'weather-api',
      name: 'Weather API',
      description: 'Get current weather for any city',
      category: 'Data',
      icon: '🌤️',
      config: {
        url: 'https://api.openweathermap.org/data/2.5/weather',
        method: 'GET',
        headers: [],
        authType: 'apikey',
        authValue: ''
      }
    },
    {
      id: 'google-search',
      name: 'Google Search',
      description: 'Search the web using Google',
      category: 'Search',
      icon: '🔍',
      config: {
        url: 'https://www.googleapis.com/customsearch/v1',
        method: 'GET',
        headers: [],
        authType: 'apikey',
        authValue: ''
      }
    },
    {
      id: 'sendgrid-email',
      name: 'SendGrid Email',
      description: 'Send emails via SendGrid',
      category: 'Communication',
      icon: '📧',
      config: {
        url: 'https://api.sendgrid.com/v3/mail/send',
        method: 'POST',
        headers: [],
        authType: 'bearer',
        authValue: ''
      }
    }
  ];

  useEffect(() => {
    loadTools();
  }, []);

  const loadTools = async () => {
    try {
      setLoading(true);
      const data = await apiClient.listTools();
      setTools(data);
    } catch (error) {
      console.error('Failed to load tools:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleHttpFormChange = (field, value) => {
    setHttpForm(prev => ({ ...prev, [field]: value }));
  };

  const handleHeaderChange = (index, field, value) => {
    const newHeaders = [...httpForm.headers];
    newHeaders[index][field] = value;
    setHttpForm(prev => ({ ...prev, headers: newHeaders }));
  };

  const addHeader = () => {
    setHttpForm(prev => ({
      ...prev,
      headers: [...prev.headers, { key: '', value: '' }]
    }));
  };

  const removeHeader = (index) => {
    setHttpForm(prev => ({
      ...prev,
      headers: prev.headers.filter((_, i) => i !== index)
    }));
  };

  const saveHttpTool = async () => {
    try {
      const toolData = {
        name: httpForm.name,
        description: httpForm.description,
        type: 'http',
        config: {
          url: httpForm.url,
          method: httpForm.method,
          headers: httpForm.headers.filter(h => h.key),
          body: httpForm.body,
          authType: httpForm.authType,
          authValue: httpForm.authValue
        }
      };

      if (selectedTool) {
        await apiClient.updateTool(selectedTool.id, toolData);
      } else {
        await apiClient.createTool(toolData);
      }

      await loadTools();
      resetHttpForm();
      alert('Tool saved successfully!');
    } catch (error) {
      console.error('Failed to save tool:', error);
      alert('Failed to save tool: ' + error.message);
    }
  };

  const resetHttpForm = () => {
    setHttpForm({
      name: '',
      description: '',
      url: '',
      method: 'GET',
      headers: [{ key: '', value: '' }],
      body: '{}',
      authType: 'none',
      authValue: ''
    });
    setSelectedTool(null);
  };

  const editTool = (tool) => {
    setSelectedTool(tool);
    setHttpForm({
      name: tool.name,
      description: tool.description || '',
      url: tool.config.url || '',
      method: tool.config.method || 'GET',
      headers: tool.config.headers?.length > 0 ? tool.config.headers : [{ key: '', value: '' }],
      body: tool.config.body || '{}',
      authType: tool.config.authType || 'none',
      authValue: tool.config.authValue || ''
    });
    setActiveTab('http');
  };

  const deleteTool = async (id) => {
    if (!confirm('Are you sure you want to delete this tool?')) return;
    
    try {
      await apiClient.deleteTool(id);
      await loadTools();
    } catch (error) {
      console.error('Failed to delete tool:', error);
      alert('Failed to delete tool: ' + error.message);
    }
  };

  const addFromRegistry = async (registryTool) => {
    try {
      const toolData = {
        name: registryTool.name,
        description: registryTool.description,
        type: 'http',
        config: registryTool.config
      };

      await apiClient.createTool(toolData);
      await loadTools();
      alert(`${registryTool.name} added successfully!`);
    } catch (error) {
      console.error('Failed to add tool:', error);
      alert('Failed to add tool: ' + error.message);
    }
  };

  const testTool = async () => {
    if (!testToolId) {
      alert('Please select a tool to test');
      return;
    }

    try {
      setTesting(true);
      let params = {};
      try {
        params = JSON.parse(testParams);
      } catch (e) {
        alert('Invalid JSON in parameters');
        return;
      }

      const result = await apiClient.testTool(testToolId, params);
      setTestResult(result);
    } catch (error) {
      console.error('Test failed:', error);
      setTestResult({
        success: false,
        error: error.message
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="tools-panel">
      <div className="tools-header">
        <h2>🛠️ Tools</h2>
        <p>Configure external APIs and tools for your agents</p>
      </div>

      {/* Tabs */}
      <div className="tools-tabs">
        <button
          className={`tab ${activeTab === 'http' ? 'active' : ''}`}
          onClick={() => setActiveTab('http')}
        >
          <Globe size={18} />
          HTTP
        </button>
        <button
          className={`tab ${activeTab === 'registry' ? 'active' : ''}`}
          onClick={() => setActiveTab('registry')}
        >
          <Package size={18} />
          Registry
        </button>
        <button
          className={`tab ${activeTab === 'test' ? 'active' : ''}`}
          onClick={() => setActiveTab('test')}
        >
          <TestTube size={18} />
          Test
        </button>
      </div>

      {/* HTTP Tab */}
      {activeTab === 'http' && (
        <div className="tab-content">
          <div className="http-form">
            <div className="form-group">
              <label>Tool Name *</label>
              <input
                type="text"
                value={httpForm.name}
                onChange={(e) => handleHttpFormChange('name', e.target.value)}
                placeholder="e.g., Weather API"
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={httpForm.description}
                onChange={(e) => handleHttpFormChange('description', e.target.value)}
                placeholder="What does this tool do?"
                rows={2}
              />
            </div>

            <div className="form-group">
              <label>URL *</label>
              <input
                type="text"
                value={httpForm.url}
                onChange={(e) => handleHttpFormChange('url', e.target.value)}
                placeholder="https://api.example.com/endpoint"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Method</label>
                <select
                  value={httpForm.method}
                  onChange={(e) => handleHttpFormChange('method', e.target.value)}
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                </select>
              </div>

              <div className="form-group">
                <label>Authentication</label>
                <select
                  value={httpForm.authType}
                  onChange={(e) => handleHttpFormChange('authType', e.target.value)}
                >
                  <option value="none">None</option>
                  <option value="bearer">Bearer Token</option>
                  <option value="apikey">API Key</option>
                  <option value="basic">Basic Auth</option>
                </select>
              </div>
            </div>

            {httpForm.authType !== 'none' && (
              <div className="form-group">
                <label>Auth Value</label>
                <input
                  type="password"
                  value={httpForm.authValue}
                  onChange={(e) => handleHttpFormChange('authValue', e.target.value)}
                  placeholder="Enter token/key"
                />
              </div>
            )}

            <div className="form-group">
              <label>Headers</label>
              {httpForm.headers.map((header, index) => (
                <div key={index} className="header-row">
                  <input
                    type="text"
                    value={header.key}
                    onChange={(e) => handleHeaderChange(index, 'key', e.target.value)}
                    placeholder="Header name"
                  />
                  <input
                    type="text"
                    value={header.value}
                    onChange={(e) => handleHeaderChange(index, 'value', e.target.value)}
                    placeholder="Header value"
                  />
                  <button
                    className="btn-icon"
                    onClick={() => removeHeader(index)}
                    disabled={httpForm.headers.length === 1}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <button className="btn-secondary" onClick={addHeader}>
                <Plus size={16} /> Add Header
              </button>
            </div>

            {(httpForm.method === 'POST' || httpForm.method === 'PUT') && (
              <div className="form-group">
                <label>Request Body (JSON)</label>
                <textarea
                  value={httpForm.body}
                  onChange={(e) => handleHttpFormChange('body', e.target.value)}
                  placeholder='{"key": "value"}'
                  rows={4}
                  style={{ fontFamily: 'monospace' }}
                />
              </div>
            )}

            <div className="form-actions">
              <button className="btn-primary" onClick={saveHttpTool}>
                {selectedTool ? 'Update Tool' : 'Save Tool'}
              </button>
              {selectedTool && (
                <button className="btn-secondary" onClick={resetHttpForm}>
                  Cancel
                </button>
              )}
            </div>
          </div>

          {/* Saved Tools List */}
          <div className="tools-list">
            <h3>Saved Tools ({tools.length})</h3>
            {loading ? (
              <p>Loading...</p>
            ) : tools.length === 0 ? (
              <p className="empty-state">No tools configured yet</p>
            ) : (
              <div className="tools-grid">
                {tools.map(tool => (
                  <div key={tool.id} className="tool-card">
                    <div className="tool-header">
                      <h4>{tool.name}</h4>
                      <div className="tool-actions">
                        <button onClick={() => editTool(tool)} title="Edit">
                          ✏️
                        </button>
                        <button onClick={() => deleteTool(tool.id)} title="Delete">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <p>{tool.description || 'No description'}</p>
                    <div className="tool-meta">
                      <span className="badge">{tool.config.method}</span>
                      <span className="url">{tool.config.url}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Registry Tab */}
      {activeTab === 'registry' && (
        <div className="tab-content">
          <div className="registry-header">
            <h3>Pre-built Tools</h3>
            <p>Quick-start with popular APIs</p>
          </div>
          <div className="registry-grid">
            {registryTools.map(tool => (
              <div key={tool.id} className="registry-card">
                <div className="registry-icon">{tool.icon}</div>
                <h4>{tool.name}</h4>
                <p>{tool.description}</p>
                <span className="category-badge">{tool.category}</span>
                <button
                  className="btn-primary"
                  onClick={() => addFromRegistry(tool)}
                >
                  <Plus size={16} /> Add Tool
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Test Tab */}
      {activeTab === 'test' && (
        <div className="tab-content">
          <div className="test-form">
            <h3>Test Tool Execution</h3>
            
            <div className="form-group">
              <label>Select Tool</label>
              <select
                value={testToolId}
                onChange={(e) => setTestToolId(e.target.value)}
              >
                <option value="">Choose a tool...</option>
                {tools.map(tool => (
                  <option key={tool.id} value={tool.id}>
                    {tool.name} ({tool.config.method} {tool.config.url})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Parameters (JSON)</label>
              <textarea
                value={testParams}
                onChange={(e) => setTestParams(e.target.value)}
                placeholder='{"city": "London", "units": "metric"}'
                rows={4}
                style={{ fontFamily: 'monospace' }}
              />
            </div>

            <button
              className="btn-primary"
              onClick={testTool}
              disabled={!testToolId || testing}
            >
              <Play size={16} />
              {testing ? 'Testing...' : 'Execute Test'}
            </button>

            {testResult && (
              <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
                <h4>{testResult.success ? '✅ Success' : '❌ Failed'}</h4>
                {testResult.success ? (
                  <>
                    <div className="result-meta">
                      <span>Status: {testResult.status_code}</span>
                      <span>Time: {testResult.execution_time_ms}ms</span>
                    </div>
                    <div className="result-body">
                      <strong>Response:</strong>
                      <pre>{JSON.stringify(testResult.body, null, 2)}</pre>
                    </div>
                  </>
                ) : (
                  <div className="error-message">
                    {testResult.error}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
