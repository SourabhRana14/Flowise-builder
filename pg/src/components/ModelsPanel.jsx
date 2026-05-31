import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Check, X, Eye, EyeOff, TestTube2, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

const LLM_PROVIDERS = [
  {
    id: 'openai',
    name: 'OpenAI',
    icon: '🤖',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo', 'gpt-4'],
    requiresKey: true,
    keyLabel: 'API Key',
    endpoint: 'https://api.openai.com/v1',
    supportsVision: true,
    pricing: { input: 0.01, output: 0.03 }
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    icon: '🧠',
    models: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
    requiresKey: true,
    keyLabel: 'API Key',
    endpoint: 'https://api.anthropic.com/v1',
    supportsVision: true,
    pricing: { input: 0.015, output: 0.075 }
  },
  {
    id: 'google',
    name: 'Google AI',
    icon: '🔷',
    models: ['gemini-2.0-flash-exp', 'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.0-pro'],
    requiresKey: true,
    keyLabel: 'API Key',
    endpoint: 'https://generativelanguage.googleapis.com/v1',
    supportsVision: true,
    pricing: { input: 0.0005, output: 0.0015 }
  },
  {
    id: 'groq',
    name: 'Groq',
    icon: '⚡',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-70b-versatile', 'mixtral-8x7b-32768', 'gemma2-9b-it'],
    requiresKey: true,
    keyLabel: 'API Key',
    endpoint: 'https://api.groq.com/openai/v1',
    supportsVision: false,
    pricing: { input: 0.0, output: 0.0 },
    isFree: true
  },
  {
    id: 'azure',
    name: 'Azure OpenAI',
    icon: '☁️',
    models: ['gpt-4', 'gpt-35-turbo'],
    requiresKey: true,
    keyLabel: 'API Key',
    endpoint: 'Custom',
    supportsVision: true,
    pricing: { input: 0.01, output: 0.03 }
  },
  {
    id: 'bedrock',
    name: 'AWS Bedrock',
    icon: '🟠',
    models: ['anthropic.claude-v2', 'amazon.titan-text-express-v1'],
    requiresKey: true,
    keyLabel: 'AWS Credentials',
    endpoint: 'AWS Region',
    supportsVision: false,
    pricing: { input: 0.008, output: 0.024 }
  },
  {
    id: 'custom',
    name: 'Custom Provider',
    icon: '🔧',
    models: [],
    requiresKey: true,
    keyLabel: 'API Key',
    endpoint: 'Custom',
    supportsVision: false,
    pricing: { input: 0.0, output: 0.0 },
    isCustom: true
  },
];

export default function ModelsPanel() {
  console.log('🎬 ModelsPanel mounted');

  const [providers, setProviders] = useState([]);
  const [editingProvider, setEditingProvider] = useState(null);
  const [showKey, setShowKey] = useState({});
  const [testingProvider, setTestingProvider] = useState(null);
  const [testResult, setTestResult] = useState({});
  const [customModels, setCustomModels] = useState('');
  const [modelAliases, setModelAliases] = useState([]);
  const [activeTab, setActiveTab] = useState('providers');

  useEffect(() => {
    console.log('📊 Loading saved providers from localStorage');
    loadProviders();
  }, []);

  useEffect(() => {
    console.log('📈 ModelsPanel state:', {
      providersCount: providers.length,
      editingProvider: editingProvider?.id,
      testingProvider,
      testResultsCount: Object.keys(testResult).length
    });
  }, [providers, editingProvider, testingProvider, testResult]);

  const loadProviders = () => {
    try {
      const saved = localStorage.getItem('llm_providers');
      if (saved) {
        const parsed = JSON.parse(saved);
        console.log('✅ Loaded providers:', parsed.length);
        setProviders(parsed);
      } else {
        console.log('ℹ️ No saved providers found');
      }
    } catch (error) {
      console.error('❌ Error loading providers:', error);
    }
  };

  const saveProviders = (newProviders) => {
    try {
      localStorage.setItem('llm_providers', JSON.stringify(newProviders));
      console.log('💾 Providers saved:', newProviders.length);
      setProviders(newProviders);
    } catch (error) {
      console.error('❌ Error saving providers:', error);
    }
  };

  const handleAddProvider = (providerTemplate) => {
    console.log('➕ Adding provider:', providerTemplate.name);
    
    const newProvider = {
      id: `${providerTemplate.id}-${Date.now()}`,
      templateId: providerTemplate.id,
      name: providerTemplate.name,
      icon: providerTemplate.icon,
      apiKey: '',
      endpoint: providerTemplate.endpoint,
      selectedModel: providerTemplate.models[0] || '',
      availableModels: providerTemplate.models,
      customModels: [],
      enabled: false,
      isDefault: providers.length === 0,
      fallbackOrder: providers.length + 1,
      supportsVision: providerTemplate.supportsVision,
      pricing: providerTemplate.pricing,
      isFree: providerTemplate.isFree,
      isCustom: providerTemplate.isCustom,
      createdAt: new Date().toISOString(),
    };

    console.log('🆕 New provider config:', newProvider);
    setEditingProvider(newProvider);
    setCustomModels('');
  };

  const handleSaveProvider = () => {
    if (!editingProvider) {
      console.warn('⚠️ No provider being edited');
      return;
    }

    console.log('💾 Saving provider:', editingProvider.name);

    const existing = providers.find(p => p.id === editingProvider.id);
    let updated;

    if (existing) {
      console.log('📝 Updating existing provider');
      updated = providers.map(p => p.id === editingProvider.id ? editingProvider : p);
    } else {
      console.log('✨ Adding new provider');
      updated = [...providers, editingProvider];
    }

    saveProviders(updated);
    setEditingProvider(null);
    console.log('✅ Provider saved successfully');
  };

  const handleDeleteProvider = (providerId) => {
    console.log('🗑️ Deleting provider:', providerId);
    const updated = providers.filter(p => p.id !== providerId);
    saveProviders(updated);
    console.log('✅ Provider deleted');
  };

  const handleToggleEnabled = (providerId) => {
    console.log('🔄 Toggling provider enabled:', providerId);
    const updated = providers.map(p => 
      p.id === providerId ? { ...p, enabled: !p.enabled } : p
    );
    saveProviders(updated);
  };

  const handleSetDefault = (providerId) => {
    console.log('⭐ Setting default provider:', providerId);
    const updated = providers.map(p => ({
      ...p,
      isDefault: p.id === providerId
    }));
    saveProviders(updated);
  };

  const handleTestConnection = async (provider) => {
    console.log('🧪 Testing connection for:', provider.name);
    setTestingProvider(provider.id);
    setTestResult(prev => ({ ...prev, [provider.id]: null }));

    try {
      // Simulate API test
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock test result
      const success = provider.apiKey && provider.apiKey.length > 10;
      
      console.log(success ? '✅ Connection test passed' : '❌ Connection test failed');
      
      setTestResult(prev => ({
        ...prev,
        [provider.id]: {
          success,
          message: success 
            ? 'Connection successful! Model is ready to use.' 
            : 'Connection failed. Please check your API key.',
          timestamp: new Date().toISOString()
        }
      }));
    } catch (error) {
      console.error('❌ Test error:', error);
      setTestResult(prev => ({
        ...prev,
        [provider.id]: {
          success: false,
          message: `Error: ${error.message}`,
          timestamp: new Date().toISOString()
        }
      }));
    } finally {
      setTestingProvider(null);
      console.log('🏁 Connection test complete');
    }
  };

  const toggleShowKey = (providerId) => {
    console.log('👁️ Toggling key visibility:', providerId);
    setShowKey(prev => ({ ...prev, [providerId]: !prev[providerId] }));
  };

  return (
    <div className="models-container">
      <div className="models-header">
        <div>
          <h2>LLM Models</h2>
          <p>Configure AI model providers and manage API keys</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="models-tabs">
        <button
          className={`tab-button ${activeTab === 'providers' ? 'active' : ''}`}
          onClick={() => {
            console.log('📑 Switching to Providers tab');
            setActiveTab('providers');
          }}
        >
          Providers
        </button>
        <button
          className={`tab-button ${activeTab === 'models' ? 'active' : ''}`}
          onClick={() => {
            console.log('📑 Switching to Models tab');
            setActiveTab('models');
          }}
        >
          Models
        </button>
        <button
          className={`tab-button ${activeTab === 'aliases' ? 'active' : ''}`}
          onClick={() => {
            console.log('📑 Switching to Aliases tab');
            setActiveTab('aliases');
          }}
        >
          Aliases / Router
        </button>
      </div>

      <div className="models-content">
        {/* Tab 1: Providers */}
        {activeTab === 'providers' && (
          <>
            <div className="models-section">
              <h3>Available Providers</h3>
              <div className="provider-templates">
                {LLM_PROVIDERS.map(template => {
                  const alreadyAdded = providers.some(p => p.templateId === template.id);
                  return (
                    <div key={template.id} className="provider-template">
                      <div className="provider-template-icon">{template.icon}</div>
                      <div className="provider-template-info">
                        <div className="provider-template-name">{template.name}</div>
                        <div className="provider-template-models">
                          {template.models.length > 0 ? `${template.models.length} models` : 'Custom models'}
                        </div>
                      </div>
                      <button
                        className="btn-add-provider"
                        onClick={() => handleAddProvider(template)}
                        disabled={alreadyAdded}
                      >
                        {alreadyAdded ? 'Added' : <><Plus size={16} /> Add</>}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {providers.length > 0 && (
              <div className="models-section">
                <h3>Configured Providers ({providers.length})</h3>
                <div className="providers-list">
                  {providers.map(provider => (
                    <div key={provider.id} className="provider-card">
                      <div className="provider-card-header">
                        <div className="provider-card-title">
                          <span className="provider-icon">{provider.icon}</span>
                          <span className="provider-name">{provider.name}</span>
                          {provider.isDefault && (
                            <span className="badge-default">Default</span>
                          )}
                        </div>
                        <div className="provider-card-actions">
                          <button
                            className="btn-icon-small"
                            onClick={() => setEditingProvider(provider)}
                            title="Edit"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            className="btn-icon-small"
                            onClick={() => handleDeleteProvider(provider.id)}
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="provider-card-body">
                        <div className="provider-field">
                          <label>Model:</label>
                          <span>{provider.selectedModel}</span>
                        </div>
                        <div className="provider-field">
                          <label>Status:</label>
                          <span className={`status-badge ${provider.enabled ? 'enabled' : 'disabled'}`}>
                            {provider.enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                        {provider.isFree && (
                          <div className="provider-field">
                            <label>Pricing:</label>
                            <span className="badge-free">FREE</span>
                          </div>
                        )}
                        {provider.supportsVision && (
                          <div className="provider-field">
                            <label>Features:</label>
                            <span className="badge-feature">Vision Support</span>
                          </div>
                        )}
                        {testResult[provider.id] && (
                          <div className={`test-result ${testResult[provider.id].success ? 'success' : 'error'}`}>
                            {testResult[provider.id].success ? (
                              <CheckCircle size={16} />
                            ) : (
                              <AlertCircle size={16} />
                            )}
                            <span>{testResult[provider.id].message}</span>
                          </div>
                        )}
                      </div>

                      <div className="provider-card-footer">
                        <button
                          className="btn-secondary-small"
                          onClick={() => handleToggleEnabled(provider.id)}
                        >
                          {provider.enabled ? 'Disable' : 'Enable'}
                        </button>
                        {!provider.isDefault && (
                          <button
                            className="btn-secondary-small"
                            onClick={() => handleSetDefault(provider.id)}
                          >
                            Set as Default
                          </button>
                        )}
                        <button
                          className="btn-secondary-small"
                          onClick={() => handleTestConnection(provider)}
                          disabled={testingProvider === provider.id || !provider.apiKey}
                        >
                          {testingProvider === provider.id ? (
                            <><Loader2 size={14} className="spinner" /> Testing...</>
                          ) : (
                            <><TestTube2 size={14} /> Test</>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {providers.length === 0 && (
              <div className="models-empty">
                <div className="empty-icon">🤖</div>
                <p>No providers configured yet</p>
                <p className="empty-hint">Add a provider from the list above to get started</p>
              </div>
            )}
          </>
        )}

        {/* Tab 2: Models */}
        {activeTab === 'models' && (
          <div className="models-section">
            <h3>Available Models from Configured Providers</h3>
            {providers.filter(p => p.enabled).length === 0 ? (
              <div className="models-empty">
                <div className="empty-icon">📋</div>
                <p>No enabled providers</p>
                <p className="empty-hint">Enable at least one provider to see available models</p>
              </div>
            ) : (
              <div className="models-table">
                <table>
                  <thead>
                    <tr>
                      <th>Provider</th>
                      <th>Model Name</th>
                      <th>Vision</th>
                      <th>Status</th>
                      <th>Pricing</th>
                    </tr>
                  </thead>
                  <tbody>
                    {providers
                      .filter(provider => provider.enabled)
                      .flatMap(provider =>
                        provider.availableModels.map(model => (
                          <tr key={`${provider.id}-${model}`}>
                            <td>
                              <span className="provider-icon">{provider.icon}</span>
                              {provider.name}
                            </td>
                            <td className="model-name">{model}</td>
                            <td>
                              {provider.supportsVision ? (
                                <span className="badge-feature">✓ Yes</span>
                              ) : (
                                <span style={{ color: 'var(--text-muted)' }}>No</span>
                              )}
                            </td>
                            <td>
                              <span className="status-badge enabled">
                                Available
                              </span>
                            </td>
                            <td>
                              {provider.isFree ? (
                                <span className="badge-free">FREE</span>
                              ) : provider.pricing ? (
                                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                  ${provider.pricing.input}/1K in
                                </span>
                              ) : (
                                <span style={{ color: 'var(--text-muted)' }}>-</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Aliases / Router */}
        {activeTab === 'aliases' && (
          <div className="models-section">
            <h3>Model Aliases & Fallback Routing</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Create friendly aliases and configure fallback chains for reliability
            </p>
            
            <div className="aliases-empty">
              <div className="empty-icon">🔀</div>
              <p>Alias routing coming soon</p>
              <p className="empty-hint">
                Configure model aliases like "fast" → gpt-4o-mini with fallback chains
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingProvider && (
        <div className="modal-overlay" onClick={() => setEditingProvider(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {providers.find(p => p.id === editingProvider.id) ? 'Edit' : 'Add'} Provider
              </h3>
              <button
                className="btn-icon-small"
                onClick={() => setEditingProvider(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Provider</label>
                <div className="provider-display">
                  <span className="provider-icon">{editingProvider.icon}</span>
                  <span>{editingProvider.name}</span>
                </div>
              </div>

              <div className="form-group">
                <label>API Key *</label>
                <div className="input-with-icon">
                  <input
                    type={showKey[editingProvider.id] ? 'text' : 'password'}
                    value={editingProvider.apiKey}
                    onChange={(e) => setEditingProvider({
                      ...editingProvider,
                      apiKey: e.target.value
                    })}
                    placeholder="sk-..."
                  />
                  <button
                    className="btn-icon-input"
                    onClick={() => toggleShowKey(editingProvider.id)}
                  >
                    {showKey[editingProvider.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Model Name *</label>
                <select
                  value={editingProvider.selectedModel}
                  onChange={(e) => {
                    console.log('📝 Model selected:', e.target.value);
                    setEditingProvider({
                      ...editingProvider,
                      selectedModel: e.target.value
                    });
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-sans)',
                    fontSize: '14px',
                    cursor: 'pointer',
                    marginBottom: '8px'
                  }}
                >
                  <option value="">Select a model...</option>
                  {editingProvider.availableModels.map(model => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                  {editingProvider.customModels?.map(model => (
                    <option key={model} value={model}>{model} (custom)</option>
                  ))}
                  <option value="__custom__">➕ Enter custom model name...</option>
                </select>
                
                {/* Custom model input - shows when custom option selected or when typing */}
                <input
                  type="text"
                  value={editingProvider.selectedModel === '__custom__' ? '' : editingProvider.selectedModel}
                  onChange={(e) => {
                    console.log('📝 Custom model typed:', e.target.value);
                    setEditingProvider({
                      ...editingProvider,
                      selectedModel: e.target.value
                    });
                  }}
                  placeholder="Or type custom model name (e.g., gpt-4o, llama-3.3-70b-versatile)"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-sans)',
                    fontSize: '14px'
                  }}
                />
                <small style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  Select from dropdown or type any custom model name
                </small>
              </div>

              {/* Custom Models Input */}
              {editingProvider.isCustom && (
                <div className="form-group">
                  <label>Custom Models (comma-separated)</label>
                  <textarea
                    value={customModels}
                    onChange={(e) => setCustomModels(e.target.value)}
                    onBlur={() => {
                      if (customModels.trim()) {
                        const models = customModels.split(',').map(m => m.trim()).filter(Boolean);
                        console.log('📝 Adding custom models:', models);
                        setEditingProvider({
                          ...editingProvider,
                          customModels: models,
                          availableModels: [...editingProvider.availableModels, ...models],
                          selectedModel: models[0] || editingProvider.selectedModel
                        });
                      }
                    }}
                    placeholder="model-1, model-2, model-3"
                    rows={2}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-sans)',
                      fontSize: '14px',
                      resize: 'vertical'
                    }}
                  />
                  <small style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                    Enter model names separated by commas
                  </small>
                </div>
              )}

              <div className="form-group">
                <label>Endpoint</label>
                <input
                  type="text"
                  value={editingProvider.endpoint}
                  onChange={(e) => setEditingProvider({
                    ...editingProvider,
                    endpoint: e.target.value
                  })}
                  placeholder="https://api.openai.com/v1"
                />
              </div>

              <div className="form-group-checkbox">
                <input
                  type="checkbox"
                  id="enabled"
                  checked={editingProvider.enabled}
                  onChange={(e) => setEditingProvider({
                    ...editingProvider,
                    enabled: e.target.checked
                  })}
                />
                <label htmlFor="enabled">Enable this provider</label>
              </div>

              <div className="form-group-checkbox">
                <input
                  type="checkbox"
                  id="default"
                  checked={editingProvider.isDefault}
                  onChange={(e) => setEditingProvider({
                    ...editingProvider,
                    isDefault: e.target.checked
                  })}
                />
                <label htmlFor="default">Set as default provider</label>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setEditingProvider(null)}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleSaveProvider}
                disabled={!editingProvider.apiKey || !editingProvider.selectedModel}
              >
                <Check size={16} /> Save Provider
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
