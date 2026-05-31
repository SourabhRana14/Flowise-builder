import { useFlow } from '../store/FlowContext';

export default function ToastContainer() {
  const { toasts } = useFlow();

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <div key={toast.id} className={`toast ${toast.type}`}>
          {toast.type === 'success' && '✅'}
          {toast.type === 'error' && '❌'}
          {toast.type === 'info' && 'ℹ️'}
          {toast.message}
        </div>
      ))}
    </div>
  );
}
