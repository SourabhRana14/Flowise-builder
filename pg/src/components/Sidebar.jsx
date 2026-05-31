import { useState, useMemo } from 'react';
import { NODE_CATEGORIES } from '../data/nodeDefinitions';
import { useFlow } from '../store/FlowContext';

export default function Sidebar() {
  const { sidebarOpen } = useFlow();
  const [search, setSearch] = useState('');
  const [openCategories, setOpenCategories] = useState(
    Object.fromEntries(NODE_CATEGORIES.map(c => [c.id, true]))
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return NODE_CATEGORIES;
    const q = search.toLowerCase();
    return NODE_CATEGORIES.map(cat => ({
      ...cat,
      items: cat.items.filter(item =>
        item.label.toLowerCase().includes(q) ||
        item.desc.toLowerCase().includes(q) ||
        item.nodeId.toLowerCase().includes(q) ||
        item.stage.toLowerCase().includes(q) ||
        item.capabilities?.some(capability => capability.toLowerCase().includes(q))
      )
    })).filter(cat => cat.items.length > 0);
  }, [search]);

  const toggleCategory = (id) => {
    setOpenCategories(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const onDragStart = (event, nodeType) => {
    console.log('🎯 Drag Start:', { nodeType, dataTransfer: event.dataTransfer });
    event.dataTransfer.setData('application/agentic-node', nodeType);
    event.dataTransfer.effectAllowed = 'move';
    console.log('✅ Drag data set:', event.dataTransfer.getData('application/agentic-node'));
  };

  return (
    <aside className={`sidebar${sidebarOpen ? '' : ' collapsed'}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">iP</div>
        <div className="sidebar-title"><span>iProcess</span> Agentic</div>
      </div>

      <div className="sidebar-search">
        <input
          type="text"
          placeholder="Search nodes, stages, capabilities"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          id="sidebar-search"
        />
      </div>

      <div className="sidebar-categories">
        {filtered.map(cat => (
          <div className="category-section" key={cat.id}>
            <div className="category-header" onClick={() => toggleCategory(cat.id)}>
              <div className="category-header-left">
                <div className="category-dot" style={{ background: cat.color }} />
                <span className="category-name">{cat.name}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="category-count">{cat.items.length}</span>
                <span className={`category-chevron${openCategories[cat.id] ? ' open' : ''}`}>▸</span>
              </div>
            </div>
            {openCategories[cat.id] && (
              <div className="category-items">
                {cat.items.map(item => (
                  <div
                    key={item.type}
                    className="node-item"
                    draggable
                    onDragStart={(e) => onDragStart(e, item.type)}
                    id={`node-item-${item.type}`}
                  >
                    <div className="node-item-icon" style={{ background: `${item.color}20`, color: item.color }}>
                      {item.icon}
                    </div>
                    <div className="node-item-info">
                      <div className="node-item-name">
                        <span>{item.nodeId}</span> {item.label.replace(`${item.nodeId} `, '')}
                      </div>
                      <div className="node-item-desc">{item.desc}</div>
                      <div className="node-item-meta">{item.stage}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}
