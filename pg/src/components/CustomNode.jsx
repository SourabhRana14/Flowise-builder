import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { useFlow } from '../store/FlowContext';

function CustomNode({ id, data, selected }) {
  const { setSelectedNode } = useFlow();

  const handleClick = (e) => {
    e.stopPropagation();
    setSelectedNode({ id, data });
  };

  return (
    <div 
      className={`custom-node-compact${selected ? ' selected' : ''}`} 
      onClick={handleClick}
      style={{ 
        borderColor: selected ? data.color : 'var(--border-color)',
        boxShadow: selected ? `0 0 15px ${data.color}40` : 'var(--shadow-sm)'
      }}
    >
      <Handle 
        type="target" 
        position={Position.Left} 
        className="compact-handle left"
        style={{ background: data.color }}
      />

      <div className="compact-icon" style={{ background: data.color }}>
        {data.icon}
      </div>

      <div className="compact-content">
        <div className="compact-title">
          <span>{data.nodeId}</span> {data.label.replace(`${data.nodeId} `, '')}
        </div>
        <div className="compact-stage">{data.stage}</div>
        {data.values?.model && (
          <div className="compact-model">
            <span className="model-icon">✨</span>
            <span className="model-text">{data.values.model}</span>
          </div>
        )}
      </div>

      <Handle 
        type="source" 
        position={Position.Right} 
        className="compact-handle right"
        style={{ background: data.color }}
      />
    </div>
  );
}

export default memo(CustomNode);
