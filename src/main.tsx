
import { createRoot } from 'react-dom/client';
import { Suspense, lazy } from 'react';
import './index.css';

// Loader component
const Loader = () => (
  <div className="w-full h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    <span className="ml-2 text-muted-foreground">Loading application...</span>
  </div>
);

// Lazy load App component
const App = lazy(() => import('./App.tsx'));

const root = createRoot(document.getElementById("root")!);

// Add error boundary for better error handling
root.render(
  <Suspense fallback={<Loader />}>
    <App />
  </Suspense>
);
