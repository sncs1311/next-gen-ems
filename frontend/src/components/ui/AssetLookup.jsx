'use client';
// frontend/src/components/ui/AssetLookup.jsx
//
// Type an asset number (e.g. "EQ-2025-0025"), this resolves it to the asset's
// UUID behind the scenes and shows a clear confirmation once found. Built
// against the CONFIRMED working endpoint used by assets/page.jsx:
//   GET /assets?q=<query>&page=1&pageSize=<n>  ->  { results: [...], total }
// (not guessed — copied from the real, working Assets Registry page's query.)

import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';

export default function AssetLookup({ value, onChange, required = false }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null); // full asset object once matched
  const boxRef = useRef(null);

  useEffect(() => {
    function onClick(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  useEffect(() => {
    if (!query || (selected && query === selected.assetNumber)) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ q: query, page: 1, pageSize: 8 });
        const { data } = await api.get(`/assets?${params}`);
        setResults(data.results || []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query, selected]);

  function pick(asset) {
    setSelected(asset);
    setQuery(asset.assetNumber);
    setResults([]);
    setOpen(false);
    onChange(asset.id, asset);
  }

  function handleInput(v) {
    setQuery(v);
    setOpen(true);
    if (selected && v !== selected.assetNumber) {
      setSelected(null);
      onChange('', null);
    }
  }

  return (
    <div className="relative" ref={boxRef}>
      <input
        required={required}
        className="form-input font-mono"
        placeholder="Type asset number, e.g. EQ-2025-0025"
        value={query}
        onChange={(e) => handleInput(e.target.value)}
        onFocus={() => setOpen(true)}
      />
      {selected && (
        <p className="text-xs text-green-600 mt-1">
          ✓ {selected.assetNumber} — {selected.make} {selected.model}
        </p>
      )}
      {open && query.length > 0 && !selected && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
          {loading ? (
            <div className="px-3 py-2 text-sm text-gray-400">Searching…</div>
          ) : results.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-400">No matching assets</div>
          ) : (
            results.map((a) => (
              <button
                key={a.id}
                type="button"
                className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                onClick={() => pick(a)}
              >
                <span className="font-mono font-medium">{a.assetNumber}</span>
                <span className="text-gray-400"> — {a.make} {a.model}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}