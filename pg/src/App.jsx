import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { FlowProvider, useFlow } from './store/FlowContext';
import ChatPanel from './components/ChatPanel';
import ToastContainer from './components/ToastContainer';
import Dashboard from './components/Dashboard';
import FeatureWorkspace from './components/FeatureWorkspace';
import MicroservicesPanel from './components/MicroservicesPanel';
import { Moon, Sun } from 'lucide-react';

function ThemeWrapper({ children }) {
  const { theme } = useFlow();
  
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('agentic_builder_theme', theme);
  }, [theme]);

  return children;
}

function Header() {
  const { theme, setTheme } = useFlow();
  const ThemeIcon = theme === 'dark' ? Sun : Moon;

  return (
    <div className="app-header">
      <div className="app-logo">
        <div className="logo-icon">iP</div>
        <div className="logo-text">
          <span className="logo-brand">iProcess</span>
          <span className="logo-subtitle">Agentic Builder</span>
        </div>
      </div>

      <div className="app-header-title">
        <h1>Microservices</h1>
      </div>

      <div className="app-header-actions">
        <button 
          className="theme-toggle" 
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title="Toggle theme"
        >
          <ThemeIcon size={18} />
        </button>
      </div>
    </div>
  );
}

function StudioLayout() {
  return (
    <div className="app-root">
      <div className="app-layout-new">
        <Header />
        <div className="app-content">
          <MicroservicesPanel />
        </div>
        <ChatPanel />
      </div>
    </div>
  );
}

function FeatureRoute() {
  const { id } = useParams();
  const { setActiveFeature } = useFlow();

  useEffect(() => {
    if (id) {
      setActiveFeature(id);
    }
  }, [id, setActiveFeature]);

  return (
    <div className="app-root">
      <FeatureWorkspace />
    </div>
  );
}

function DashboardRoute() {
  return (
    <div className="app-root">
      <Dashboard />
    </div>
  );
}

export default function App() {
  return (
    <FlowProvider>
      <ThemeWrapper>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardRoute />} />
            <Route path="/studio" element={<StudioLayout />} />
            <Route path="/feature/:id" element={<FeatureRoute />} />
          </Routes>
          <ToastContainer />
        </BrowserRouter>
      </ThemeWrapper>
    </FlowProvider>
  );
}
