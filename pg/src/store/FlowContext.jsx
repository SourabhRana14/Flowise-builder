import { useCallback, createContext, useContext, useMemo, useRef, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  AGENT_TEMPLATES,
  FULL_AGENTIC_TYPES,
  REQUIRED_AGENTIC_TYPES,
  getDefaultValues,
  getNodeDef,
} from '../data/nodeDefinitions';
import { apiClient } from '../services/api';

const FlowContext = createContext(null);

const edgeStyle = { stroke: 'rgba(47,128,237,0.55)', strokeWidth: 3 };

function buildFlowNode(nodeConfig) {
  const def = getNodeDef(nodeConfig.type);
  if (!def) {
    return null;
  }

  const values = {
    ...getDefaultValues(def),
    ...(nodeConfig.values || {}),
  };

  const node = {
    id: nodeConfig.id || uuidv4(),
    type: 'custom',
    position: nodeConfig.position || { x: 0, y: 0 },
    data: {
      nodeType: def.type,
      nodeId: def.nodeId,
      label: def.label,
      desc: def.desc,
      icon: def.icon,
      color: def.color,
      category: def.category,
      categoryName: def.categoryName,
      stage: def.stage,
      role: def.role,
      inputFrom: def.inputFrom,
      outputTo: def.outputTo,
      priority: def.priority,
      capabilities: def.capabilities || [],
      fields: def.fields || [],
      values,
    },
  };
  
  return node;
}

function buildFlowEdge(source, target, index, prefix = 'edge') {
  return {
    id: `${prefix}-${index}-${source}-${target}`,
    source,
    target,
    animated: true,
    type: 'default',
    style: edgeStyle,
  };
}

function getNodeValue(node, key) {
  return node.data?.values?.[key];
}

function validateWorkflow(nodes, edges) {
  const nodeTypes = nodes.map((node) => node.data?.nodeType).filter(Boolean);
  const missingRequired = REQUIRED_AGENTIC_TYPES.filter((type) => !nodeTypes.includes(type));
  const missingFull = FULL_AGENTIC_TYPES.filter((type) => !nodeTypes.includes(type));

  const requiredFieldIssues = nodes.flatMap((node) =>
    (node.data?.fields || [])
      .filter((field) => field.required)
      .filter((field) => {
        const value = getNodeValue(node, field.key);
        return value === undefined || value === null || value === '';
      })
      .map((field) => `${node.data.nodeId} ${field.label}`)
  );

  const connectedIds = new Set(edges.flatMap((edge) => [edge.source, edge.target]));
  const disconnectedNodes = nodes.length > 1
    ? nodes.filter((node) => !connectedIds.has(node.id)).map((node) => node.data?.nodeId || node.id)
    : [];

  const errors = [];
  const warnings = [];

  if (nodes.length === 0) {
    errors.push('Add at least the P1 backbone nodes to start a workflow.');
  }

  if (missingRequired.length > 0) {
    errors.push(`Missing required agentic nodes: ${missingRequired.map((type) => getNodeDef(type)?.nodeId).join(', ')}`);
  }

  if (requiredFieldIssues.length > 0) {
    errors.push(`Required configuration missing: ${requiredFieldIssues.join(', ')}`);
  }

  if (missingFull.length > 0 && missingFull.length < FULL_AGENTIC_TYPES.length) {
    warnings.push(`Full agentic capability is missing: ${missingFull.map((type) => getNodeDef(type)?.nodeId).join(', ')}`);
  }

  if (disconnectedNodes.length > 0) {
    warnings.push(`Disconnected nodes: ${disconnectedNodes.join(', ')}`);
  }

  return {
    status: errors.length > 0 ? 'blocked' : warnings.length > 0 ? 'partial' : 'ready',
    errors,
    warnings,
    missingRequired,
    missingFull,
    requiredFieldIssues,
    disconnectedNodes,
  };
}

export function FlowProvider({ children }) {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [flowName, setFlowName] = useState('Untitled Agent Workflow');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [theme, setTheme] = useState(() => localStorage.getItem('agentic_builder_theme') || 'dark');
  const [currentView, setCurrentView] = useState('dashboard');
  const [activePhase, setActivePhase] = useState('builder');
  const [activeFeature, setActiveFeature] = useState('studio');
  const [copilotOpen, setCopilotOpen] = useState(true);
  const [preflightMessages, setPreflightMessages] = useState([]);
  const [previewMessages, setPreviewMessages] = useState([]);
  const [runLogs, setRunLogs] = useState([]);
  const [refineMessage, setRefineMessage] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    {
      id: '1',
      role: 'bot',
      text: 'I can help inspect the workflow, explain node responsibilities, or suggest the next BRD phase to configure.',
    },
  ]);
  const [toasts, setToasts] = useState([]);
  const [savedFlows, setSavedFlows] = useState([]);
  const [loadingFlows, setLoadingFlows] = useState(true);
  const [currentAgentId, setCurrentAgentId] = useState(null);
  const reactFlowInstanceRef = useRef(null);

  // Load saved flows from backend on mount
  useEffect(() => {
    const loadSavedFlows = async () => {
      try {
        const agents = await apiClient.listAgents();
        
        const flows = agents.map(agent => {
          const nodes = (agent.workflow?.nodes || []).map(nodeData => 
            buildFlowNode({
              id: nodeData.id,
              type: nodeData.type,
              position: nodeData.position || { x: 0, y: 0 },
              values: nodeData.values || {}
            })
          ).filter(Boolean);
          
          return {
            id: agent.id,
            name: agent.name,
            description: agent.description,
            nodes: nodes,
            edges: agent.workflow?.edges || [],
            workflowJson: agent.workflow,
            savedAt: agent.updated_at || agent.created_at,
            version: agent.version || 1,
            viewport: agent.config?.viewport,
          };
        });
        
        setSavedFlows(flows);
      } catch (error) {
        console.error('Failed to load agents:', error);
        addToast('Failed to load saved agents', 'error');
        try {
          const localFlows = JSON.parse(localStorage.getItem('agentic_builder_flows') || '[]');
          setSavedFlows(localFlows);
        } catch {
          setSavedFlows([]);
        }
      } finally {
        setLoadingFlows(false);
      }
    };
    loadSavedFlows();
  }, []);

  const workflowValidation = useMemo(() => validateWorkflow(nodes, edges), [nodes, edges]);

  const workflowJson = useMemo(() => ({
    schemaVersion: 'agentic-builder/v1',
    name: flowName,
    lifecyclePhase: activePhase,
    generatedAt: new Date().toISOString(),
    nodes: nodes.map((node) => ({
      id: node.id,
      type: node.data?.nodeType,
      nodeId: node.data?.nodeId,
      label: node.data?.label,
      stage: node.data?.stage,
      inputFrom: node.data?.inputFrom,
      outputTo: node.data?.outputTo,
      values: node.data?.values || {},
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
    })),
    validation: {
      status: workflowValidation.status,
      errorCount: workflowValidation.errors.length,
      warningCount: workflowValidation.warnings.length,
    },
  }), [activePhase, edges, flowName, nodes, workflowValidation]);

  const addToast = useCallback((message, type = 'info') => {
    const id = uuidv4();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((toast) => toast.id !== id)), 3200);
  }, []);

  const addNode = useCallback((type, position) => {
    const newNode = buildFlowNode({ type, position });
    if (!newNode) {
      return null;
    }
    setNodes((prev) => [...prev, newNode]);
    addToast(`Added ${newNode.data.nodeId} to the workflow`, 'success');
    return newNode;
  }, [addToast]);

  const updateNodeData = useCallback((nodeId, key, value) => {
    setNodes((prev) => prev.map((node) => {
      if (node.id !== nodeId) return node;
      
      return {
        ...node,
        data: {
          ...node.data,
          values: {
            ...node.data.values,
            [key]: value,
          },
        },
      };
    }));

    setSelectedNode((prev) => {
      if (!prev || prev.id !== nodeId) return prev;
      return {
        ...prev,
        data: {
          ...prev.data,
          values: {
            ...prev.data.values,
            [key]: value,
          },
        },
      };
    });
  }, []);

  const deleteNode = useCallback((nodeId) => {
    setNodes((prev) => prev.filter((node) => node.id !== nodeId));
    setEdges((prev) => prev.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    
    if (selectedNode?.id === nodeId) {
      setSelectedNode(null);
    }
    
    addToast('Node deleted', 'info');
  }, [addToast, selectedNode]);

  const duplicateNode = useCallback((nodeId) => {
    const original = nodes.find((node) => node.id === nodeId);
    if (!original) return;
    const newNode = {
      ...original,
      id: uuidv4(),
      position: { x: original.position.x + 60, y: original.position.y + 60 },
      data: { ...original.data, values: { ...original.data.values } },
      selected: false,
    };
    setNodes((prev) => [...prev, newNode]);
    addToast(`Duplicated ${original.data.nodeId}`, 'success');
  }, [addToast, nodes]);

  const saveFlow = useCallback(async () => {
    try {
      const agentData = {
        name: flowName,
        description: `Agent workflow with ${nodes.length} nodes`,
        workflow: {
          nodes: nodes.map((node) => ({
            id: node.id,
            type: node.data?.nodeType,
            position: node.position,
            values: node.data?.values || {},
          })),
          edges: edges.map((edge) => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
          })),
        },
        config: {
          viewport: reactFlowInstanceRef.current?.getViewport(),
          validation: workflowValidation,
        },
      };

      let savedAgent;
      
      if (currentAgentId) {
        savedAgent = await apiClient.updateAgent(currentAgentId, agentData);
        addToast(`Updated "${savedAgent.name}" successfully`, 'success');
      } else {
        savedAgent = await apiClient.createAgent(agentData);
        setCurrentAgentId(savedAgent.id);
        addToast(`Created "${savedAgent.name}" successfully`, 'success');
      }
      
      const flow = {
        id: savedAgent.id,
        name: savedAgent.name,
        description: savedAgent.description,
        nodes,
        edges,
        workflowJson,
        savedAt: savedAgent.updated_at || savedAgent.created_at,
        version: 1,
      };
      
      setSavedFlows(prev => [flow, ...prev.filter(f => f.id !== savedAgent.id)]);
      
      return savedAgent;
    } catch (error) {
      console.error('Save failed:', error);
      addToast('Failed to save to backend, saved locally', 'error');
      
      const version = savedFlows.filter((flow) => flow.name === flowName).length + 1;
      const flow = {
        id: uuidv4(),
        name: flowName,
        version,
        nodes,
        edges,
        workflowJson,
        savedAt: new Date().toISOString(),
        viewport: reactFlowInstanceRef.current?.getViewport(),
      };
      const updated = [flow, ...savedFlows];
      setSavedFlows(updated);
      localStorage.setItem('agentic_builder_flows', JSON.stringify(updated));
    }
  }, [addToast, edges, flowName, nodes, savedFlows, workflowJson, workflowValidation, currentAgentId]);

  const loadFlow = useCallback((flow) => {
    setNodes(flow.nodes || []);
    setEdges(flow.edges || []);
    setFlowName(flow.name || 'Imported Agent Workflow');
    setCurrentAgentId(flow.id || null);
    setSelectedNode(null);
    setCurrentView('workspace');
    setActivePhase('builder');
    
    setTimeout(() => {
      if (flow.viewport && reactFlowInstanceRef.current) {
        reactFlowInstanceRef.current.setViewport(flow.viewport);
      } else if (reactFlowInstanceRef.current) {
        reactFlowInstanceRef.current.fitView({ padding: 0.2, duration: 300 });
      }
    }, 100);
    
    addToast(`Loaded "${flow.name}"`, 'info');
  }, [addToast]);

  const clearCanvas = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setSelectedNode(null);
    setActivePhase('builder');
    addToast('Canvas cleared', 'info');
  }, [addToast]);

  const createNewFlow = useCallback(() => {
    const timestamp = new Date().toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    const uniqueName = `Agent ${timestamp}`;
    
    setNodes([]);
    setEdges([]);
    setSelectedNode(null);
    setFlowName(uniqueName);
    setCurrentAgentId(null);
    setActivePhase('builder');
    setCurrentView('workspace');
  }, []);

  const createTemplateFlow = useCallback((templateId) => {
    const template = AGENT_TEMPLATES.find((item) => item.id === templateId);
    if (!template) return;

    const templateNodes = template.nodes.map(buildFlowNode).filter(Boolean);
    const templateEdges = template.edges.map(([source, target], index) => buildFlowEdge(source, target, index, template.id));

    setNodes(templateNodes);
    setEdges(templateEdges);
    setSelectedNode(null);
    setFlowName(template.name);
    setActivePhase('builder');
    setCurrentView('workspace');
    addToast(`${template.name} template loaded`, 'success');
    setTimeout(() => reactFlowInstanceRef.current?.fitView({ padding: 0.2, duration: 350 }), 50);
  }, [addToast]);

  const exportFlow = useCallback(() => {
    const data = JSON.stringify({
      ...workflowJson,
      reactFlow: {
        nodes,
        edges,
        viewport: reactFlowInstanceRef.current?.getViewport(),
      },
    }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${flowName.replace(/\s+/g, '_')}.agentic.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    addToast('Workflow JSON exported', 'success');
  }, [addToast, edges, flowName, nodes, workflowJson]);

  const importFlow = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        const importedNodes = data.reactFlow?.nodes || data.nodes || [];
        const importedEdges = data.reactFlow?.edges || data.edges || [];
        setNodes(importedNodes);
        setEdges(importedEdges);
        setFlowName(data.name || 'Imported Agent Workflow');
        setSelectedNode(null);
        setActivePhase('builder');
        setCurrentView('workspace');
        addToast('Workflow imported', 'success');
      } catch {
        addToast('Invalid workflow file', 'error');
      }
    };
    reader.readAsText(file);
  }, [addToast]);

  const openFeature = useCallback((featureId) => {
    setActiveFeature(featureId);
    setCurrentView('feature');
  }, []);

  const runPreflight = useCallback(() => {
    const messages = [
      ...workflowValidation.errors.map((message) => ({ level: 'error', message })),
      ...workflowValidation.warnings.map((message) => ({ level: 'warning', message })),
    ];
    const result = messages.length
      ? messages
      : [{ level: 'info', message: 'Preflight passed with no blocking issues.' }];
    setPreflightMessages(result);
    setRunLogs((prev) => [
      {
        id: uuidv4(),
        nodeId: 'PREFLIGHT',
        preview: result.map((item) => `${item.level.toUpperCase()}: ${item.message}`).join(' | '),
        ts: new Date().toLocaleTimeString(),
      },
      ...prev.slice(0, 9),
    ]);
    addToast(messages.some((item) => item.level === 'error') ? 'Preflight found blockers' : 'Preflight complete', messages.some((item) => item.level === 'error') ? 'error' : 'success');
    return result;
  }, [addToast, workflowValidation]);

  const previewAgent = useCallback(() => {
    if (nodes.length === 0) {
      addToast('Add nodes before running preview', 'error');
      return;
    }

    const order = ['N01', 'N09', 'N05', 'N07', 'N08', 'N03', 'N04', 'N06', 'N02'];
    const sorted = [...nodes].sort((a, b) => {
      const aIndex = order.indexOf(a.data?.nodeId);
      const bIndex = order.indexOf(b.data?.nodeId);
      return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
    });
    const path = sorted.map((node) => node.data?.nodeId).filter(Boolean);
    const messages = [
      { label: 'Path', message: path.join(' -> ') || 'No executable path' },
      { label: 'Tools', message: nodes.some((node) => node.data?.nodeId === 'N04') ? 'Tool registry available to orchestrator' : 'No tool node configured' },
      { label: 'Knowledge', message: nodes.some((node) => node.data?.nodeId === 'N03') ? 'RAG lookup available' : 'No knowledge node configured' },
      { label: 'Human', message: nodes.some((node) => node.data?.values?.humanApproval) ? 'Human approval enabled' : 'No human approval checkpoint' },
    ];
    setPreviewMessages(messages);
    setRunLogs((prev) => [
      ...sorted.map((node, index) => ({
        id: uuidv4(),
        nodeId: node.data?.nodeId || `STEP-${index + 1}`,
        preview: `${node.data?.label || 'Node'} executed in preview mode`,
        ts: new Date().toLocaleTimeString(),
      })).reverse(),
      ...prev,
    ].slice(0, 12));
    addToast('Agent preview generated', 'success');
  }, [addToast, nodes]);

  const autoLayoutFlow = useCallback(() => {
    const order = ['N01', 'N09', 'N05', 'N07', 'N08', 'N03', 'N04', 'N06', 'N02'];
    setNodes((prev) => {
      const sorted = [...prev].sort((a, b) => {
        const aIndex = order.indexOf(a.data?.nodeId);
        const bIndex = order.indexOf(b.data?.nodeId);
        return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
      });
      const positions = new Map();
      sorted.forEach((node, index) => {
        const lane = index % 3;
        const row = Math.floor(index / 3);
        positions.set(node.id, { x: -560 + lane * 360, y: -120 + row * 220 });
      });
      return prev.map((node) => ({ ...node, position: positions.get(node.id) || node.position }));
    });
    setTimeout(() => reactFlowInstanceRef.current?.fitView({ padding: 0.18, duration: 350 }), 50);
    addToast('Auto layout applied', 'success');
  }, [addToast]);

  const shareFlow = useCallback(() => {
    saveFlow();
    addToast('Share package prepared for review', 'success');
  }, [addToast, saveFlow]);

  const publishFlow = useCallback(() => {
    if (workflowValidation.status === 'blocked') {
      addToast(workflowValidation.errors[0] || 'Resolve validation blockers before publish', 'error');
      return;
    }
    setActivePhase('publisher');
    addToast('Publish configuration opened', 'success');
  }, [addToast, workflowValidation]);

  const applyCopilotRefinement = useCallback((prompt) => {
    const text = prompt.trim().toLowerCase();
    if (!text) return;

    const candidates = [
      { test: ['guardrail', 'safety', 'pii', 'compliance'], type: 'n09_guardrail' },
      { test: ['memory', 'remember', 'recall'], type: 'n08_conversation_memory' },
      { test: ['rag', 'knowledge', 'document', 'citation'], type: 'n03_rag_knowledge' },
      { test: ['tool', 'api', 'mcp', 'action'], type: 'n04_tools' },
      { test: ['prompt', 'instruction'], type: 'n06_prompt_manager' },
      { test: ['model', 'llm', 'fallback'], type: 'n02_llm_manager' },
    ];

    const nodeTypes = new Set(nodes.map((node) => node.data?.nodeType));
    const toAdd = candidates
      .filter((candidate) => candidate.test.some((term) => text.includes(term)))
      .map((candidate) => candidate.type)
      .filter((type) => !nodeTypes.has(type));

    if (toAdd.length === 0) {
      const msg = 'Copilot found no missing component from this instruction. Try mentioning guardrail, memory, RAG, tool, prompt, or model.';
      setRefineMessage(msg);
      addToast('No graph change applied', 'info');
      return;
    }

    setNodes((prev) => {
      const baseX = prev.length ? Math.max(...prev.map((node) => node.position.x)) + 320 : -240;
      const baseY = prev.length ? Math.min(...prev.map((node) => node.position.y)) : -80;
      const newNodes = toAdd.map((type, index) => buildFlowNode({
        type,
        position: { x: baseX, y: baseY + index * 170 },
      })).filter(Boolean);
      return [...prev, ...newNodes];
    });

    const addedIds = toAdd.map((type) => getNodeDef(type)?.nodeId).filter(Boolean);
    const msg = `Copilot added: ${addedIds.join(', ')}. Review configuration and connect them in the canvas.`;
    setRefineMessage(msg);
    setRunLogs((prev) => [{
      id: uuidv4(),
      nodeId: 'COPILOT',
      preview: msg,
      ts: new Date().toLocaleTimeString(),
    }, ...prev.slice(0, 9)]);
    addToast('Copilot refinement applied', 'success');
  }, [addToast, nodes]);

  const sendChatMessage = useCallback(async (text) => {
    if (!text.trim()) return;
    const userMsg = { id: uuidv4(), role: 'user', text };
    setChatMessages((prev) => [...prev, userMsg]);

    try {
      // Use real backend API
      const response = await apiClient.chat('default', [
        ...chatMessages.filter(m => m.role !== 'bot' || m.text !== 'I can help inspect the workflow, explain node responsibilities, or suggest the next BRD phase to configure.'),
        { role: 'user', content: text }
      ]);
      
      setChatMessages((prev) => [...prev, { 
        id: uuidv4(), 
        role: 'bot', 
        text: response.response || 'Response received from agent.' 
      }]);
    } catch (error) {
      console.error('Chat error:', error);
      setChatMessages((prev) => [...prev, { 
        id: uuidv4(), 
        role: 'bot', 
        text: `Error: ${error.message || 'Failed to connect to backend'}` 
      }]);
    }
  }, [chatMessages]);

  const value = {
    nodes,
    setNodes,
    edges,
    setEdges,
    selectedNode,
    setSelectedNode,
    flowName,
    setFlowName,
    sidebarOpen,
    setSidebarOpen,
    theme,
    setTheme,
    currentView,
    setCurrentView,
    activePhase,
    setActivePhase,
    activeFeature,
    setActiveFeature,
    openFeature,
    copilotOpen,
    setCopilotOpen,
    preflightMessages,
    previewMessages,
    runLogs,
    refineMessage,
    runPreflight,
    previewAgent,
    autoLayoutFlow,
    shareFlow,
    publishFlow,
    applyCopilotRefinement,
    chatOpen,
    setChatOpen,
    chatMessages,
    sendChatMessage,
    toasts,
    addToast,
    savedFlows,
    loadingFlows,
    saveFlow,
    loadFlow,
    createNewFlow,
    createTemplateFlow,
    addNode,
    updateNodeData,
    deleteNode,
    duplicateNode,
    clearCanvas,
    exportFlow,
    importFlow,
    reactFlowInstanceRef,
    workflowValidation,
    workflowJson,
  };

  return <FlowContext.Provider value={value}>{children}</FlowContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useFlow = () => {
  const ctx = useContext(FlowContext);
  if (!ctx) throw new Error('useFlow must be inside FlowProvider');
  return ctx;
};
