import { useState } from 'react';
import { Plus, Workflow } from 'lucide-react';
import Sidebar from './Sidebar';
import FlowCanvas from './FlowCanvas';
import PropertiesPanel from './PropertiesPanel';
import { useFlow } from '../store/FlowContext';

export default function AgentStudioPanel() {
  const { nodes } = useFlow();
  const [canvasOpen, setCanvasOpen] = useState(false);

  if (!canvasOpen) {
    return (
      <div className="agent-studio-empty">
        <Workflow size={64} />
        <h2>Agent Studio</h2>
        <p>Create and configure intelligent agents using visual workflow builder</p>
        <button className="btn-create-agent" onClick={() => setCanvasOpen(true)}>
          <Plus size={18} />
          Create New Agent
        </button>
      </div>
    );
  }

  return (
    <div className="agent-studio-workspace">
      <Sidebar />
      <div className="agent-studio-canvas">
        <FlowCanvas />
      </div>
      <PropertiesPanel />
    </div>
  );
}
