import { Component, type ErrorInfo, type PropsWithChildren, type ReactNode } from 'react';
import { Vehicle3DViewportState } from './Vehicle3DViewportState';

interface State {
  failed: boolean;
}

export class Vehicle3DErrorBoundary extends Component<PropsWithChildren, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // Intentionally avoid logging renderer details: native/GL errors can include device metadata.
  }

  render(): ReactNode {
    if (this.state.failed) return <Vehicle3DViewportState state="error" />;
    return this.props.children;
  }
}
