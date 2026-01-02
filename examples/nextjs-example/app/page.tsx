export default function Home() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>F.A.I.L. Kit Next.js Example</h1>
      <p>This is a demo RAG agent for F.A.I.L. Kit testing.</p>
      
      <h2>Endpoints</h2>
      <ul>
        <li>
          <strong>POST /api/eval/run</strong> - F.A.I.L. Kit evaluation endpoint
        </li>
      </ul>
      
      <h2>Test the Agent</h2>
      <pre style={{ background: '#f5f5f5', padding: '1rem', borderRadius: '4px' }}>
{`curl -X POST http://localhost:3000/api/eval/run \\
  -H "Content-Type: application/json" \\
  -d '{"inputs": {"user": "What are your prices?"}}'`}
      </pre>
      
      <h2>Run the Audit</h2>
      <pre style={{ background: '#f5f5f5', padding: '1rem', borderRadius: '4px' }}>
{`fail-audit init --framework nextjs
fail-audit scan
fail-audit run --format html`}
      </pre>
    </main>
  );
}
