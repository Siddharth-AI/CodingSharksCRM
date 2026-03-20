'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface ApiLog {
  id: string;
  method: string;
  url: string;
  status?: number;
  duration?: number;
  requestHeaders?: Record<string, string>;
  requestBody?: unknown;
  responseBody?: unknown;
  error?: string;
  timestamp: number;
}

const METHOD_COLOR: Record<string, string> = {
  GET: 'bg-blue-500',
  POST: 'bg-green-500',
  PUT: 'bg-yellow-500',
  PATCH: 'bg-orange-500',
  DELETE: 'bg-red-500',
};

function statusColor(s?: number) {
  if (!s) return 'text-gray-400';
  if (s < 300) return 'text-green-400';
  if (s < 400) return 'text-yellow-400';
  return 'text-red-400';
}

function JsonView({ data }: { data: unknown }) {
  return (
    <pre className="text-xs bg-gray-900 rounded p-2 overflow-auto max-h-56 text-green-300 whitespace-pre-wrap break-all leading-relaxed">
      {data === undefined ? '(empty)' : JSON.stringify(data, null, 2)}
    </pre>
  );
}

export default function ApiDebugger() {
  const [logs, setLogs] = useState<ApiLog[]>([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<ApiLog | null>(null);
  const [tab, setTab] = useState<'response' | 'request' | 'headers'>('response');
  const sheetRef = useRef<HTMLDivElement>(null);
  const originalFetch = useRef<typeof window.fetch | null>(null);

  const addLog = useCallback((log: ApiLog) => {
    setLogs(prev => {
      const next = [log, ...prev];
      return next.length > 100 ? next.slice(0, 100) : next;
    });
  }, []);

  // Intercept window.fetch — captures ALL RTK Query + fetch-based calls
  useEffect(() => {
    if (typeof window === 'undefined') return;

    originalFetch.current = window.fetch;
    const _fetch = originalFetch.current;

    window.fetch = async function interceptedFetch(input, init) {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
          ? input.href
          : (input as Request).url;

      // Only log /api/* calls
      if (!url.includes('/api/')) {
        return _fetch(input, init);
      }

      // RTK Query passes a Request object as `input` with init=undefined.
      // Plain fetch calls pass a string/URL as `input` with headers/body in `init`.
      const isRequestObj = input instanceof Request;

      const method = (
        isRequestObj ? input.method : (init?.method || 'GET')
      ).toUpperCase();

      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const start = Date.now();

      // --- Headers ---
      const requestHeaders: Record<string, string> = {};
      const headerSrc: Headers | null = isRequestObj
        ? input.headers
        : init?.headers
          ? new Headers(init.headers as HeadersInit)
          : null;

      if (headerSrc) {
        headerSrc.forEach((v, k) => {
          requestHeaders[k] = k.toLowerCase() === 'authorization' ? 'Bearer ***' : v;
        });
      }

      // --- Body ---
      // Must clone a Request before reading body so the original stream stays intact.
      let requestBody: unknown;
      try {
        if (isRequestObj) {
          const cloned = (input as Request).clone();
          requestBody = await cloned.json();
        } else if (init?.body) {
          requestBody = JSON.parse(init.body as string);
        }
      } catch { /* body is not JSON or is empty */ }

      try {
        const response = await _fetch(input, init);
        const duration = Date.now() - start;

        // Clone to safely read body
        let responseBody: unknown;
        try {
          responseBody = await response.clone().json();
        } catch { /* not JSON */ }

        addLog({
          id,
          method,
          url,
          status: response.status,
          duration,
          requestHeaders,
          requestBody,
          responseBody,
          timestamp: start,
        });

        return response;
      } catch (err) {
        addLog({
          id,
          method,
          url,
          duration: Date.now() - start,
          requestHeaders,
          requestBody,
          error: err instanceof Error ? err.message : String(err),
          timestamp: start,
        });
        throw err;
      }
    };

    return () => {
      if (originalFetch.current) {
        window.fetch = originalFetch.current;
      }
    };
  }, [addLog]);

  // Close panel on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="fixed bottom-6 right-6 z-9999 w-12 h-12 rounded-full bg-indigo-600 hover:bg-indigo-700 shadow-xl flex items-center justify-center text-white text-lg transition-colors"
        title="API Debugger"
      >
        🛰️
        {logs.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center font-bold pointer-events-none">
            {logs.length > 99 ? '99+' : logs.length}
          </span>
        )}
      </button>

      {/* Slide-up panel */}
      <div
        ref={sheetRef}
        className={`fixed bottom-0 left-0 right-0 z-9998 bg-gray-950 text-white shadow-2xl border-t border-gray-700 transition-transform duration-300 ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ height: '62vh' }}
      >
        {/* Panel header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700 bg-gray-900 shrink-0">
          <span className="font-semibold text-sm text-indigo-400">
            🛰️ API Debugger
            <span className="ml-2 text-gray-400 font-normal">({logs.length} requests)</span>
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => { setLogs([]); setSelected(null); }}
              className="text-xs text-gray-400 hover:text-red-400 px-2 py-1 rounded transition-colors"
            >
              Clear
            </button>
            <button
              onClick={() => { setOpen(false); setSelected(null); }}
              className="text-gray-400 hover:text-white text-lg leading-none px-1 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex" style={{ height: 'calc(100% - 41px)' }}>
          {/* Request list */}
          <div className="w-2/5 border-r border-gray-700 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <p className="text-gray-500 text-sm">No API calls yet.</p>
                <p className="text-gray-600 text-xs mt-1">
                  Navigate or perform actions to see requests here.
                </p>
              </div>
            ) : (
              logs.map(log => (
                <div
                  key={log.id}
                  onClick={() => { setSelected(log); setTab('response'); }}
                  className={`flex items-center gap-2 px-3 py-2 cursor-pointer border-b border-gray-800 hover:bg-gray-800 text-xs transition-colors ${
                    selected?.id === log.id ? 'bg-gray-800 border-l-2 border-l-indigo-500' : ''
                  }`}
                >
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold text-white shrink-0 ${
                      METHOD_COLOR[log.method] || 'bg-gray-500'
                    }`}
                  >
                    {log.method}
                  </span>
                  <span className={`font-mono font-bold shrink-0 ${statusColor(log.status)}`}>
                    {log.status ?? (log.error ? 'ERR' : '…')}
                  </span>
                  <span className="truncate text-gray-300 flex-1">
                    {log.url.replace('/api', '')}
                  </span>
                  {log.duration != null && (
                    <span className="text-gray-500 shrink-0">{log.duration}ms</span>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Detail panel */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {!selected ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500 text-sm">Select a request to inspect</p>
              </div>
            ) : (
              <>
                {/* URL bar */}
                <div className="px-3 py-2 border-b border-gray-700 bg-gray-900 shrink-0">
                  <div className="flex items-center gap-2 text-xs mb-1">
                    <span
                      className={`px-1.5 py-0.5 rounded font-bold text-white ${
                        METHOD_COLOR[selected.method] || 'bg-gray-500'
                      }`}
                    >
                      {selected.method}
                    </span>
                    <span className={`font-bold ${statusColor(selected.status)}`}>
                      {selected.status ?? (selected.error ? 'Error' : 'Pending')}
                    </span>
                    {selected.duration != null && (
                      <span className="text-gray-400">{selected.duration}ms</span>
                    )}
                    <span className="text-gray-500 ml-auto">
                      {new Date(selected.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-gray-300 font-mono text-xs break-all">{selected.url}</p>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-700 bg-gray-900 shrink-0">
                  {(['response', 'request', 'headers'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className={`px-4 py-1.5 text-xs capitalize transition-colors ${
                        tab === t
                          ? 'text-indigo-400 border-b-2 border-indigo-400'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                <div className="flex-1 overflow-auto p-3">
                  {tab === 'response' && (
                    selected.error
                      ? <JsonView data={{ error: selected.error }} />
                      : <JsonView data={selected.responseBody} />
                  )}
                  {tab === 'request' && <JsonView data={selected.requestBody ?? null} />}
                  {tab === 'headers' && <JsonView data={selected.requestHeaders ?? {}} />}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
