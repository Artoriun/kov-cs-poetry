import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback: (retry: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Catches render errors below it and shows something readable instead of an empty page.
 *
 * Without one, any thrown error unmounts the whole tree and leaves a blank white document
 * — no message, nothing to act on, and indistinguishable from the site being down. That is
 * the difference between "a section looks wrong" and "it is broken" for whoever reports it.
 *
 * Deliberately renders no wrapper element, so it cannot disturb hydration of the
 * prerendered markup.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Kept on the console rather than swallowed: there is no error-reporting service wired
    // up yet, so this is the only record of what happened.
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return this.props.fallback(() => this.setState({ error: null }));
    }
    return this.props.children;
  }
}
