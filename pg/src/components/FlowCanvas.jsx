import { useCallback, useRef, useState } from 'react';
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  addEdge,
  BackgroundVariant,
  ConnectionMode,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useFlow } from '../store/FlowContext';
import CustomNode from './CustomNode';
import { NODE_CATEGORIES } from '../data/nodeDefinitions';
import { v4 as uuidv4 } from 'uuid';

const nodeTypes = { custom: CustomNode };

const defaultEdgeOptions = {
  animated: true,
  style: { stroke: 'rgba(47,128,237,0.55)', strokeWidth: 3 },
  type: 'default',
};

export default function FlowCanvas() {
  const {
    nodes, setNodes, edges, setEdges,
    addNode, setSelectedNode, reactFlowInstanceRef,
    workflowValidation, workflowJson,
    copilotOpen, setCopilotOpen,
    applyCopilotRefinement,
    preflightMessages, previewMessages, runLogs, refineMessage,
  } = useFlow();
  const reactFlowWrapper = useRef(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [copilotPrompt, setCopilotPrompt] = useState('');

  const onNodesChange = useCallback((changes) => {
    setNodes((nds) => {
      let result = [...nds];
      changes.forEach((change) => {
        if (change.type === 'position' && change.position) {
          result = result.map(n => n.id === change.id ? { ...n, position: change.position } : n);
        } else if (change.type === 'select') {
          result = result.map(n => n.id === change.id ? { ...n, selected: change.selected } : n);
        } else if (change.type === 'remove') {
          result = result.filter(n => n.id !== change.id);
        } else if (change.type === 'dimensions' && change.dimensions) {
          result = result.map(n => n.id === change.id ? { ...n, measured: { width: change.dimensions.width, height: change.dimensions.height } } : n);
        }
      });
      return result;
    });
  }, [setNodes]);

  const onEdgesChange = useCallback((changes) => {
    setEdges((eds) => {
      let result = [...eds];
      changes.forEach((change) => {
        if (change.type === 'remove') {
          result = result.filter(e => e.id !== change.id);
        } else if (change.type === 'select') {
          result = result.map(e => e.id === change.id ? { ...e, selected: change.selected } : e);
        }
      });
      return result;
    });
  }, [setEdges]);

  const onConnect = useCallback((params) => {
    setEdges((eds) => addEdge({
      ...params,
      id: uuidv4(),
      animated: true,
      style: { stroke: 'rgba(47,128,237,0.55)', strokeWidth: 3 },
      type: 'default',
    }, eds));
  }, [setEdges]);

  const onDragOver = useCallback((event) => {
    console.log('🔄 Drag Over');
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = (event) => {
    console.log('📍 Drop Event:', event);
    event.preventDefault();
    const type = event.dataTransfer.getData('application/agentic-node');
    console.log('📦 Dropped node type:', type);
    if (!type || !reactFlowInstanceRef.current) {
      console.error('❌ Drop failed:', { type, hasInstance: !!reactFlowInstanceRef.current });
      return;
    }
    const position = reactFlowInstanceRef.current.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });
    console.log('✅ Adding node at position:', position);
    addNode(type, position);
  };

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setContextMenu(null);
  }, [setSelectedNode]);

  const onPaneContextMenu = (event) => {
    event.preventDefault();
    const position = reactFlowInstanceRef.current?.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });
    setContextMenu({ x: event.clientX, y: event.clientY, flowPos: position });
  };

  const addNodeFromContext = (type) => {
    if (contextMenu?.flowPos) {
      addNode(type, contextMenu.flowPos);
    }
    setContextMenu(null);
  };

  const applyCopilot = () => {
    applyCopilotRefinement(copilotPrompt);
    setCopilotPrompt('');
  };

  const hasExecutionPreview = preflightMessages.length > 0 || previewMessages.length > 0 || runLogs.length > 0 || refineMessage;

  return (
    <div 
      className="canvas-wrapper" 
      ref={reactFlowWrapper}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {nodes.length === 0 && (
        <div className="empty-canvas">
          <div className="empty-canvas-icon">N05</div>
          <h2>Build an Agentic Workflow</h2>
          <p>Start from a template or add the P1 backbone nodes: N05, N02, and N01.</p>
        </div>
      )}
      <div className={`builder-inspector ${workflowValidation.status}`}>
        <div className="builder-inspector-top">
          <span>Workflow JSON</span>
          <strong>{workflowValidation.status}</strong>
        </div>
        <div className="builder-inspector-stats">
          <span>{nodes.length} nodes</span>
          <span>{edges.length} edges</span>
          <span>{workflowValidation.errors.length} errors</span>
          <span>{workflowValidation.warnings.length} warnings</span>
        </div>
        {(workflowValidation.errors[0] || workflowValidation.warnings[0]) && (
          <div className="builder-inspector-note">
            {workflowValidation.errors[0] || workflowValidation.warnings[0]}
          </div>
        )}
        <details>
          <summary>Preview</summary>
          <pre>{JSON.stringify(workflowJson, null, 2)}</pre>
        </details>
      </div>
      <div style={{ flex: 1, width: '100%', height: '100%', position: 'relative' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onPaneClick={onPaneClick}
          onContextMenu={onPaneContextMenu}
          onInit={(instance) => { reactFlowInstanceRef.current = instance; }}
          nodeTypes={nodeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          connectionMode={ConnectionMode.Loose}
          fitView
          proOptions={{ hideAttribution: true }}
          deleteKeyCode={['Backspace', 'Delete']}
        >
          <Controls />
          <MiniMap
            nodeColor={(node) => node.data?.color || '#6366f1'}
            maskColor="rgba(0,0,0,0.7)"
            style={{ background: 'var(--bg-card)' }}
          />
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="rgba(47,128,237,0.10)" />
        </ReactFlow>
      </div>

      {copilotOpen ? (
        <div className="floating-command">
          <button className="command-hide" type="button" title="Hide copilot" onClick={() => setCopilotOpen(false)}>
            ˅
          </button>
          <input
            value={copilotPrompt}
            onChange={(e) => setCopilotPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') applyCopilot();
            }}
            placeholder="Refine agent: add guardrail before tool calls, add RAG, add memory..."
          />
          <button className="topbar-btn success" type="button" disabled={!copilotPrompt.trim()} onClick={applyCopilot}>
            Apply
          </button>
        </div>
      ) : (
        <button className="floating-command-show" type="button" onClick={() => setCopilotOpen(true)}>
          Copilot
        </button>
      )}

      {hasExecutionPreview && (
        <div className="execution-preview">
          <div className="execution-preview-head">
            <strong>Execution Preview</strong>
            <span>{runLogs.length} logs</span>
          </div>
          {refineMessage && <div className="preview-line info"><b>COPILOT</b> {refineMessage}</div>}
          {preflightMessages.map((item) => (
            <div className={`preview-line ${item.level}`} key={`${item.level}-${item.message}`}>
              <b>{item.level.toUpperCase()}</b> {item.message}
            </div>
          ))}
          {previewMessages.map((item) => (
            <div className="preview-line" key={`${item.label}-${item.message}`}>
              <b>{item.label}</b> {item.message}
            </div>
          ))}
          {runLogs.slice(0, 6).map((log) => (
            <div className="step-row" key={log.id}>
              <b>{log.nodeId}</b>
              <p>{log.preview}</p>
              <small>{log.ts}</small>
            </div>
          ))}
        </div>
      )}

      {contextMenu && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setContextMenu(null)} />
          <div className="context-menu" style={{ left: contextMenu.x, top: contextMenu.y, maxHeight: '400px', overflowY: 'auto' }}>
            <div style={{ padding: '6px 12px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Quick Add Node
            </div>
            <div className="context-menu-divider" />
            {NODE_CATEGORIES.map(cat => (
              <div key={cat.id}>
                <div style={{ padding: '4px 12px', fontSize: '10px', color: cat.color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {cat.name}
                </div>
                {cat.items.map(item => (
                  <button key={item.type} className="context-menu-item" onClick={() => addNodeFromContext(item.type)}>
                    {item.icon} {item.nodeId} {item.label.replace(`${item.nodeId} `, '')}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
