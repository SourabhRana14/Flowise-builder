import { useMemo, useState } from 'react';
import {
  BarChart3,
  CheckCircle2,
  CircleAlert,
  Clock,
  KeyRound,
  PlayCircle,
  Radio,
  Rocket,
  Server,
  ShieldCheck,
} from 'lucide-react';
import { useFlow } from '../store/FlowContext';

const executionOrder = ['N01', 'N09', 'N05', 'N07', 'N08', 'N03', 'N04', 'N06', 'N02'];

function sortByExecution(nodes) {
  return [...nodes].sort((a, b) => {
    const aId = a.data?.nodeId || '';
    const bId = b.data?.nodeId || '';
    const aIndex = executionOrder.indexOf(aId);
    const bIndex = executionOrder.indexOf(bId);

    if (aIndex !== -1 || bIndex !== -1) {
      return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
    }

    return aId.localeCompare(bId, undefined, { numeric: true });
  });
}

function StatusPill({ status }) {
  const Icon = status === 'ready' ? CheckCircle2 : CircleAlert;
  return (
    <span className={`status-pill ${status}`}>
      <Icon size={14} />
      {status}
    </span>
  );
}

function EmptyWorkflowNotice() {
  return (
    <div className="empty-phase">
      <CircleAlert size={24} />
      <strong>No workflow nodes on the canvas</strong>
      <span>Use the Builder phase or start from a template on the dashboard.</span>
    </div>
  );
}

export default function LifecycleWorkspace() {
  const {
    activePhase,
    setActivePhase,
    flowName,
    nodes,
    edges,
    workflowValidation,
    workflowJson,
    addToast,
  } = useFlow();
  const [scenario, setScenario] = useState('Customer asks for return eligibility and order status.');
  const [lastRun, setLastRun] = useState(null);
  const [targetEnv, setTargetEnv] = useState('Staging');
  const [canaryPercent, setCanaryPercent] = useState(10);
  const [selectedChannels, setSelectedChannels] = useState(['Web Chat', 'REST API']);

  const orderedNodes = useMemo(() => sortByExecution(nodes), [nodes]);

  const simulationSteps = useMemo(() => orderedNodes.map((node, index) => ({
    id: node.id,
    nodeId: node.data.nodeId,
    label: node.data.label,
    stage: node.data.stage,
    latency: 35 + (index * 18),
    cost: node.data.nodeId === 'N02' ? '$0.018' : '$0.000',
    output: {
      status: workflowValidation.status === 'blocked' ? 'waiting_for_validation' : 'ok',
      next: node.data.outputTo,
      contract: node.data.stage,
    },
  })), [orderedNodes, workflowValidation.status]);

  const runSimulation = () => {
    if (nodes.length === 0) {
      addToast('Add workflow nodes before simulation', 'error');
      setActivePhase('builder');
      return;
    }
    setLastRun(new Date().toLocaleTimeString());
    addToast('Simulation trace generated', workflowValidation.status === 'blocked' ? 'info' : 'success');
  };

  const promoteDeployment = () => {
    if (workflowValidation.status === 'blocked') {
      addToast(workflowValidation.errors[0], 'error');
      return;
    }
    addToast(`${flowName} queued for ${targetEnv}`, 'success');
  };

  const toggleChannel = (channel) => {
    setSelectedChannels((prev) =>
      prev.includes(channel) ? prev.filter((item) => item !== channel) : [...prev, channel]
    );
  };

  const totalLatency = simulationSteps.reduce((sum, step) => sum + step.latency, 0);
  const endpointSlug = flowName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'agent-workflow';
  const apiKey = `ip_live_${endpointSlug.slice(0, 12)}_****`;

  if (activePhase === 'simulation') {
    return (
      <div className="lifecycle-workspace">
        <div className="phase-header">
          <div>
            <span className="phase-kicker">Agentic Simulation</span>
            <h2>Step-through execution trace</h2>
            <p>Runs the workflow in controlled mode with node outputs, latency, cost, and mock/real response boundaries.</p>
          </div>
          <div className="phase-actions">
            <StatusPill status={workflowValidation.status} />
            <button className="topbar-btn success" onClick={runSimulation}>
              <PlayCircle size={15} /> Run Trace
            </button>
          </div>
        </div>

        {nodes.length === 0 ? <EmptyWorkflowNotice /> : (
          <>
            <div className="simulation-controls">
              <label>
                Scenario
                <textarea value={scenario} onChange={(e) => setScenario(e.target.value)} rows={3} />
              </label>
              <div className="simulation-summary">
                <div><span>Nodes</span><strong>{nodes.length}</strong></div>
                <div><span>Edges</span><strong>{edges.length}</strong></div>
                <div><span>Estimated latency</span><strong>{totalLatency} ms</strong></div>
                <div><span>Last run</span><strong>{lastRun || 'Not run'}</strong></div>
              </div>
            </div>

            <div className="trace-list">
              {simulationSteps.map((step, index) => (
                <div className="trace-step" key={step.id}>
                  <div className="trace-index">{index + 1}</div>
                  <div className="trace-body">
                    <div className="trace-title">
                      <strong>{step.nodeId}</strong>
                      <span>{step.label.replace(`${step.nodeId} `, '')}</span>
                      <em>{step.stage}</em>
                    </div>
                    <div className="trace-grid">
                      <span>Latency: {step.latency} ms</span>
                      <span>Cost: {step.cost}</span>
                      <span>Output to: {step.output.next}</span>
                    </div>
                    <pre>{JSON.stringify(step.output, null, 2)}</pre>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  if (activePhase === 'deployment') {
    return (
      <div className="lifecycle-workspace">
        <div className="phase-header">
          <div>
            <span className="phase-kicker">Agentic Deployment</span>
            <h2>Release workflow as a production service</h2>
            <p>Freezes configuration, binds environment variables, registers endpoints, and creates a deployment record.</p>
          </div>
          <div className="phase-actions">
            <StatusPill status={workflowValidation.status} />
            <button className="topbar-btn success" onClick={promoteDeployment}>
              <Rocket size={15} /> Queue Deployment
            </button>
          </div>
        </div>

        {nodes.length === 0 ? <EmptyWorkflowNotice /> : (
          <div className="deployment-grid">
            <section className="deployment-panel">
              <h3>Environment Promotion</h3>
              <div className="environment-options">
                {['Development', 'Staging', 'Production'].map((env) => (
                  <button
                    key={env}
                    className={`environment-option${targetEnv === env ? ' active' : ''}`}
                    onClick={() => setTargetEnv(env)}
                  >
                    <Server size={16} />
                    <strong>{env}</strong>
                    <span>{env === 'Production' ? 'Approval required' : 'Auto deploy allowed'}</span>
                  </button>
                ))}
              </div>
              <label className="range-field">
                Canary rollout
                <input type="range" min="0" max="100" value={canaryPercent} onChange={(e) => setCanaryPercent(e.target.value)} />
                <span>{canaryPercent}% initial traffic</span>
              </label>
            </section>

            <section className="deployment-panel">
              <h3>Deployment Record</h3>
              <div className="record-list">
                <div><span>Workflow</span><strong>{flowName}</strong></div>
                <div><span>Version</span><strong>v1.0.0-draft</strong></div>
                <div><span>Target</span><strong>{targetEnv}</strong></div>
                <div><span>Rollback</span><strong>Last healthy version</strong></div>
                <div><span>State backend</span><strong>Redis + MongoDB</strong></div>
              </div>
            </section>

            <section className="deployment-panel wide">
              <h3>Validation Gates</h3>
              <div className="gate-list">
                {workflowValidation.errors.length === 0 ? (
                  <div className="gate-row pass"><CheckCircle2 size={16} /> Required P1/P2 nodes configured</div>
                ) : workflowValidation.errors.map((error) => (
                  <div className="gate-row fail" key={error}><CircleAlert size={16} /> {error}</div>
                ))}
                {workflowValidation.warnings.map((warning) => (
                  <div className="gate-row warn" key={warning}><CircleAlert size={16} /> {warning}</div>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    );
  }

  if (activePhase === 'publisher') {
    const channels = ['Web Chat', 'WhatsApp', 'Slack', 'REST API'];
    return (
      <div className="lifecycle-workspace">
        <div className="phase-header">
          <div>
            <span className="phase-kicker">Agentic Publisher</span>
            <h2>Expose the deployed agent to channels</h2>
            <p>Configures chat gateways, API credentials, channel formatting, branding, rate limits, and access control.</p>
          </div>
          <div className="phase-actions">
            <button className="topbar-btn success" onClick={() => addToast('Publisher configuration saved', 'success')}>
              <Radio size={15} /> Save Publisher
            </button>
          </div>
        </div>

        {nodes.length === 0 ? <EmptyWorkflowNotice /> : (
          <div className="publisher-grid">
            <section className="publisher-panel">
              <h3>Channels</h3>
              <div className="channel-list">
                {channels.map((channel) => (
                  <label className="channel-option" key={channel}>
                    <input
                      type="checkbox"
                      checked={selectedChannels.includes(channel)}
                      onChange={() => toggleChannel(channel)}
                    />
                    <span>{channel}</span>
                  </label>
                ))}
              </div>
            </section>

            <section className="publisher-panel">
              <h3>Access</h3>
              <div className="record-list">
                <div><span>API Key</span><strong>{apiKey}</strong></div>
                <div><span>Rate Limit</span><strong>120 requests/minute</strong></div>
                <div><span>Auth</span><strong>API Key + SSO ready</strong></div>
                <div><span>Gateway</span><strong>/gateway/{endpointSlug}</strong></div>
              </div>
            </section>

            <section className="publisher-panel wide">
              <h3>Generated Endpoints</h3>
              <div className="endpoint-list">
                {selectedChannels.map((channel) => (
                  <div className="endpoint-row" key={channel}>
                    <KeyRound size={16} />
                    <span>{channel}</span>
                    <code>https://api.iprocess.local/agents/{endpointSlug}/{channel.toLowerCase().replace(/\s+/g, '-')}</code>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="lifecycle-workspace">
      <div className="phase-header">
        <div>
          <span className="phase-kicker">Agentic Dashboard</span>
          <h2>Operational monitoring and optimization</h2>
          <p>Aggregates execution logs, token usage, latency, cost, safety violations, KB hit rates, and feedback signals.</p>
        </div>
        <div className="phase-actions">
          <StatusPill status={workflowValidation.status} />
        </div>
      </div>

      {nodes.length === 0 ? <EmptyWorkflowNotice /> : (
        <>
          <div className="analytics-grid">
            <div className="analytics-card"><Clock size={18} /><span>Median latency</span><strong>{Math.max(totalLatency, 120)} ms</strong></div>
            <div className="analytics-card"><BarChart3 size={18} /><span>Token usage</span><strong>{nodes.some((node) => node.data.nodeId === 'N02') ? '18.4k' : '0'}</strong></div>
            <div className="analytics-card"><ShieldCheck size={18} /><span>Safety events</span><strong>{workflowValidation.errors.length}</strong></div>
            <div className="analytics-card"><Server size={18} /><span>KB hit rate</span><strong>{nodes.some((node) => node.data.nodeId === 'N03') ? '84%' : 'N/A'}</strong></div>
          </div>

          <div className="analytics-columns">
            <section className="analytics-panel">
              <h3>Conversation Quality</h3>
              <div className="quality-bars">
                <div><span>Resolution</span><strong>72%</strong><i style={{ width: '72%' }} /></div>
                <div><span>Escalation</span><strong>9%</strong><i style={{ width: '9%' }} /></div>
                <div><span>Prompt A/B lift</span><strong>14%</strong><i style={{ width: '14%' }} /></div>
              </div>
            </section>

            <section className="analytics-panel">
              <h3>Workflow Artifact</h3>
              <pre>{JSON.stringify(workflowJson, null, 2)}</pre>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
