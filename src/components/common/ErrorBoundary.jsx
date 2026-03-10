import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <section className="admin-shell">
          <section className="card panel-card single-panel">
            <div className="card-body stack" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
              <h2 style={{ color: 'var(--danger)', marginBottom: '0.5rem' }}>エラーが発生しました</h2>
              <p className="muted" style={{ marginBottom: '1.5rem' }}>
                画面の表示中に問題が発生しました。再読み込みしてください。
              </p>
              <button
                className="button"
                type="button"
                onClick={() => window.location.reload()}
              >
                再読み込み
              </button>
            </div>
          </section>
        </section>
      );
    }
    return this.props.children;
  }
}
