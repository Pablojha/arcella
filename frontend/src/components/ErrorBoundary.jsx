import { Component } from 'react';
import Logo from './brand/Logo';
import Button from './ui/Button';

/** Friendly fallback instead of a blank screen when a page crashes (for example a stale chunk after a deploy). */
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidUpdate(previous) {
    if (this.state.error && previous.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex flex-col items-center px-6 py-20 text-center" role="alert">
        <Logo size={56} />
        <h1 className="mt-5 font-display text-2xl font-bold tracking-tight">Something went wrong on this page</h1>
        <p className="mt-2 max-w-sm text-muted">It's not you. Reloading usually fixes it and fetches the latest version of Arcella.</p>
        <Button size="lg" className="mt-6" onClick={() => window.location.reload()}>
          Reload
        </Button>
      </div>
    );
  }
}
