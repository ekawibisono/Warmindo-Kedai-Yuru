import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '20px',
          background: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          margin: '20px',
          fontFamily: 'Arial, sans-serif'
        }}>
          <h2 style={{ color: '#e74c3c', marginBottom: '15px' }}>
            Oops! Something went wrong
          </h2>
          
          <details style={{ marginBottom: '15px' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
              Error Details (Click to expand)
            </summary>
            <div style={{
              background: '#fff',
              padding: '10px',
              marginTop: '10px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '12px',
              fontFamily: 'monospace'
            }}>
              <p><strong>Error:</strong> {this.state.error && this.state.error.toString()}</p>
              <p><strong>Component Stack:</strong></p>
              <pre>{this.state.errorInfo.componentStack}</pre>
            </div>
          </details>

          <div style={{ marginBottom: '15px' }}>
            <p><strong>Environment Info:</strong></p>
            <ul>
              <li>API URL: {process.env.REACT_APP_API_URL}</li>
              <li>Environment: {process.env.NODE_ENV}</li>
              <li>Google Client ID: {process.env.REACT_APP_GOOGLE_CLIENT_ID ? 'Set' : 'Not Set'}</li>
              <li>User Agent: {navigator.userAgent}</li>
            </ul>
          </div>

          <button 
            onClick={() => window.location.reload()}
            style={{
              background: '#007bff',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;