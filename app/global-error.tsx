'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Log error immediately without useEffect to avoid SSR issues
  if (typeof window !== 'undefined') {
    console.error('Global error:', error);
  }

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Error - YoForex</title>
        <style dangerouslySetInnerHTML={{__html: `
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: system-ui, -apple-system, sans-serif;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-center;
            background: linear-gradient(135deg, #fef2f2 0%, #ffedd5 100%);
            padding: 1rem;
          }
          .container {
            max-width: 42rem;
            width: 100%;
            background: white;
            border-radius: 0.5rem;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            padding: 2rem;
          }
          h1 {
            font-size: 1.5rem;
            font-weight: bold;
            color: #dc2626;
            margin-bottom: 0.5rem;
          }
          p {
            color: #6b7280;
            margin-bottom: 1.5rem;
          }
          .error-details {
            background: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 0.375rem;
            padding: 1rem;
            margin-bottom: 1.5rem;
            font-family: monospace;
            font-size: 0.875rem;
          }
          .buttons {
            display: flex;
            gap: 0.75rem;
            flex-wrap: wrap;
          }
          button {
            padding: 0.5rem 1rem;
            border-radius: 0.375rem;
            font-weight: 500;
            cursor: pointer;
            border: none;
            font-size: 0.875rem;
          }
          .btn-primary {
            background: #2563eb;
            color: white;
          }
          .btn-primary:hover {
            background: #1d4ed8;
          }
          .btn-secondary {
            background: white;
            color: #374151;
            border: 1px solid #d1d5db;
          }
          .btn-secondary:hover {
            background: #f9fafb;
          }
        `}} />
      </head>
      <body>
        <div className="container">
          <h1>⚠ Something went wrong!</h1>
          <p>A critical error occurred. The error has been logged and we'll look into it.</p>
          
          {process.env.NODE_ENV === 'development' && (
            <div className="error-details">
              <strong>Error:</strong> {error.message}
              {error.digest && (
                <div style={{ marginTop: '0.5rem' }}>
                  <strong>Digest:</strong> {error.digest}
                </div>
              )}
            </div>
          )}

          <div className="buttons">
            <button
              className="btn-primary"
              onClick={reset}
              data-testid="button-try-again"
            >
              Try Again
            </button>
            
            <button
              className="btn-secondary"
              onClick={() => window.location.href = '/'}
              data-testid="button-go-home"
            >
              Go Home
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
