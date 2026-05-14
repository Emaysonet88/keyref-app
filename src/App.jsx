import ErrorBoundary from './ErrorBoundary';
import KeyRefPro from './KeyRefPro';

export default function App() {
  return (
    <ErrorBoundary>
      <KeyRefPro />
    </ErrorBoundary>
  );
}
