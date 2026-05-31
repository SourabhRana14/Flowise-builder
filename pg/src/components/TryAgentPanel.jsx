import { useState, useEffect, useRef } from 'react';
import { Send, Trash2, Copy, Download, Bot, User, Loader2 } from 'lucide-react';
import { useFlow } from '../store/FlowContext';
import { apiClient } from '../services/api';

export default function TryAgentPanel() {
  const { savedFlows, loadingFlows } = useFlow();
  const [selectedAgentId, setSelectedAgentId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [executionTrace, setExecutionTrace] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleAgentSelect = (agentId) => {
    setSelectedAgentId(agentId);
    setMessages([]);
    setExecutionTrace(null);
    
    const agent = savedFlows.find(f => f.id === agentId);
    setMessages([{
      id: Date.now(),
      role: 'assistant',
      content: `Hi! I'm ${agent?.name}. How can I help you today?`,
      timestamp: new Date().toISOString()
    }]);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    if (!selectedAgentId) {
      alert('Please select an agent first');
      return;
    }

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const apiMessages = messages
        .filter(m => m.role !== 'system')
        .map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content
        }));
      
      apiMessages.push({
        role: 'user',
        content: userMessage.content
      });

      const providersData = localStorage.getItem('llm_providers');
      const providers = providersData ? JSON.parse(providersData) : [];

      const response = await apiClient.chat(selectedAgentId, apiMessages, { providers });

      const assistantMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: response.response || 'No response from agent',
        timestamp: new Date().toISOString(),
        metadata: {
          tokens: response.tokens,
          cost: response.cost
        }
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (response.trace) {
        setExecutionTrace(response.trace);
      }

    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: `Error: ${error.message || 'Failed to get response from agent'}`,
        timestamp: new Date().toISOString(),
        isError: true
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setExecutionTrace(null);
  };

  const handleCopyMessage = (content) => {
    navigator.clipboard.writeText(content);
  };

  const handleExportChat = () => {
    const agent = savedFlows.find(f => f.id === selectedAgentId);
    const exportData = {
      agent: {
        id: agent?.id,
        name: agent?.name
      },
      messages: messages,
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-${agent?.name}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loadingFlows) {
    return (
      <div className="try-agent-container">
        <div className="try-agent-loading">
          <Loader2 size={32} className="spinner" />
          <p>Loading agents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="try-agent-container">
      <div className="try-agent-header">
        <h2>Try Agent</h2>
        <p>Test your agents with real conversations</p>
      </div>

      <div className="try-agent-content">
        {/* Agent Selector */}
        <div className="try-agent-selector">
          <label>Select Agent:</label>
          <select
            value={selectedAgentId || ''}
            onChange={(e) => handleAgentSelect(e.target.value)}
            disabled={savedFlows.length === 0}
          >
            <option value="">Choose an agent...</option>
            {savedFlows.map(agent => (
              <option key={agent.id} value={agent.id}>
                {agent.name} ({agent.nodes?.length || 0} nodes)
              </option>
            ))}
          </select>
        </div>

        {savedFlows.length === 0 && (
          <div className="try-agent-empty">
            <Bot size={48} style={{ opacity: 0.3 }} />
            <p>No agents available. Create an agent in Agent Studio first.</p>
          </div>
        )}

        {selectedAgentId && (
          <>
            {/* Chat Area */}
            <div className="try-agent-chat">
              <div className="chat-messages">
                {messages.map(message => (
                  <div
                    key={message.id}
                    className={`chat-message ${message.role} ${message.isError ? 'error' : ''}`}
                  >
                    <div className="message-icon">
                      {message.role === 'user' ? <User size={20} /> : <Bot size={20} />}
                    </div>
                    <div className="message-content">
                      <div className="message-text">{message.content}</div>
                      {message.metadata && (
                        <div className="message-metadata">
                          <span>{message.metadata.duration}ms</span>
                          {message.metadata.tokens && (
                            <span>• {message.metadata.tokens} tokens</span>
                          )}
                          {message.metadata.cost && (
                            <span>• ${message.metadata.cost}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      className="message-copy"
                      onClick={() => handleCopyMessage(message.content)}
                      title="Copy message"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                ))}
                {isLoading && (
                  <div className="chat-message assistant loading">
                    <div className="message-icon">
                      <Bot size={20} />
                    </div>
                    <div className="message-content">
                      <Loader2 size={16} className="spinner" />
                      <span>Thinking...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="chat-input-area">
                <div className="chat-actions">
                  <button
                    className="btn-icon"
                    onClick={handleClearChat}
                    title="Clear chat"
                    disabled={messages.length === 0}
                  >
                    <Trash2 size={18} />
                  </button>
                  <button
                    className="btn-icon"
                    onClick={handleExportChat}
                    title="Export chat"
                    disabled={messages.length === 0}
                  >
                    <Download size={18} />
                  </button>
                </div>
                <div className="chat-input">
                  <textarea
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    rows={3}
                    disabled={isLoading}
                  />
                  <button
                    className="btn-send"
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || isLoading}
                  >
                    <Send size={20} />
                  </button>
                </div>
              </div>
            </div>

            {/* Execution Trace */}
            {executionTrace && (
              <div className="try-agent-trace">
                <h3>Execution Trace</h3>
                <pre>{JSON.stringify(executionTrace, null, 2)}</pre>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
