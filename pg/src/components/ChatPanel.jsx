import { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import { useFlow } from '../store/FlowContext';

export default function ChatPanel() {
  const { chatOpen, setChatOpen, chatMessages, sendChatMessage } = useFlow();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSend = () => {
    if (!input.trim()) return;
    sendChatMessage(input);
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!chatOpen) {
    return (
      <button className="chat-fab" onClick={() => setChatOpen(true)} id="chat-fab" title="Open workflow assistant">
        <MessageCircle size={22} />
      </button>
    );
  }

  return (
    <div className="chat-panel" id="chat-panel">
      <div className="chat-header">
        <h3><MessageCircle size={17} /> Workflow Assistant</h3>
        <button className="panel-close" onClick={() => setChatOpen(false)}><X size={15} /></button>
      </div>

      <div className="chat-messages">
        {chatMessages.map(msg => (
          <div key={msg.id} className={`chat-msg ${msg.role === 'user' ? 'user' : 'bot'}`}>
            {msg.text.split('\n').map((line, i) => (
              <span key={i}>{line}{i < msg.text.split('\n').length - 1 && <br />}</span>
            ))}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask me anything..."
          id="chat-input"
        />
        <button className="chat-send-btn" onClick={handleSend} id="chat-send">
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
