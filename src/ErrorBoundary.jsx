import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Log but don't crash the app
    console.error('App crashed:', error, info);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        minHeight: '100vh',
        background: '#0d0d0d',
        color: '#e8e8e8',
        padding: 24,
        fontFamily: "'IBM Plex Sans', sans-serif",
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          maxWidth: 500,
          background: '#161616',
          border: '1px solid #2a2a2a',
          borderLeft: '3px solid #e05252',
          padding: 24,
          width: '100%',
        }}>
          <div style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 32,
            letterSpacing: 2,
            color: '#e05252',
            marginBottom: 12,
          }}>
            SOMETHING BROKE
          </div>
          <div style={{
            fontFamily: 'monospace',
            fontSize: 12,
            color: '#787878',
            lineHeight: 1.6,
            marginBottom: 18,
          }}>
            KeyRef ran into an unexpected error. Try resetting first;
            if that doesn't work, reload the page. Your saved lookups are safe.
          </div>
          {this.state.error?.message && (
            <div style={{
              fontFamily: 'monospace',
              fontSize: 11,
              color: '#e05252',
              background: 'rgba(224,82,82,0.08)',
              padding: '10px 12px',
              marginBottom: 18,
              wordBreak: 'break-word',
            }}>
              {this.state.error.message}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={this.handleReset} style={{
              background: 'transparent',
              border: '1px solid #f5a623',
              color: '#f5a623',
              fontFamily: 'monospace',
              fontSize: 12,
              padding: '10px 16px',
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}>Reset</button>
            <button onClick={this.handleReload} style={{
              background: '#f5a623',
              border: 'none',
              color: '#000',
              fontFamily: 'monospace',
              fontSize: 12,
              padding: '10px 16px',
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: 1,
              fontWeight: 600,
            }}>Reload Page</button>
          </div>
        </div>
      </div>
    );
  }
}
