import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[Papido Error Boundary Caught Error]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '80vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{
            maxWidth: '520px',
            width: '100%',
            background: '#FFFFFF',
            borderRadius: '16px',
            padding: '32px',
            border: '1.5px solid #FCA5A5',
            boxShadow: '0 10px 25px rgba(239, 68, 68, 0.1)',
            textAlign: 'center'
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: '#FEE2E2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              color: '#DC2626'
            }}>
              <AlertTriangle size={32} />
            </div>

            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#1F2937', marginBottom: '8px' }}>
              Something went wrong
            </h2>
            <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '20px', lineHeight: 1.5 }}>
              {this.state.error?.message || 'An unexpected display error occurred. You can easily reload or return to the main portal.'}
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={this.handleReset}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #F97316, #EA580C)',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <RefreshCw size={14} /> Reload Page
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: '1.5px solid #E5E7EB',
                  background: '#F9FAFB',
                  color: '#374151',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Home size={14} /> Return Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
