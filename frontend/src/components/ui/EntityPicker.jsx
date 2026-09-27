'use client';
// frontend/src/components/ui/EntityPicker.jsx
//
// Reusable type-ahead picker: shows a human-readable label (e.g. "EQ-2025-0025 —
// Dynapac CA250"), but the value stored/submitted is the entity's UUID. Fixes the
// pattern across fuel/maintenance "New" forms where users were being asked to
// manually paste a raw asset/driver/project UUID, which is both bad UX and the
// direct cause of the 422 errors from express-validator's .isUUID() checks.
//
// ASSUMPTION FLAGGED: I don't have assets/drivers/projects controller+routes, so
// this assumes each list endpoint supports `?search=<query>` and returns an array
// of objects. Adjust `endpoint` and `labelFn`/`idKey` per entity below if your
// actual response shape differs — everything entity-specific is passed in as props,
// nothing else in this file needs to change.

import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';

export default function EntityPicker({
  endpoint,        // e.g. '/assets', '/drivers', '/projects' — queried as `${endpoint}?search=...`
  labelFn,         // (item) => string shown in the dropdown and input once selected
  idKey = 'id',    // field on the returned item holding the UUID
  value,           // currently selected UUID
  onChange,        // (uuid, item|null) => void
  placeholder = 'Search…',
  required = false,
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState('');
  const boxRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function onClick(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query || query === selectedLabel) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`${endpoint}?search=${encodeURIComponent(query)}`);
        // ASSUMPTION: endpoint returns either a bare array, or { results: [...] }.
        // Handles both shapes so a difference here doesn't silently break the picker.
        setResults(Array.isArray(data) ? data : data.results || []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query, endpoint, selectedLabel]);

  // If a value UUID is passed in from outside (e.g. editing an existing record)
  // but we don't yet have a label for it, we just show the raw id as fallback.
  useEffect(() => {
    if (value && !selectedLabel) setSelectedLabel(value);
    if (!value) setSelectedLabel('');
  }, [value]);

  function select(item) {
    const label = labelFn(item);
    setSelectedLabel(label);
    setQuery(label);
    setResults([]);
    setOpen(false);
    onChange(item[idKey], item);
  }

  function handleInput(v) {
    setQuery(v);
    setOpen(true);
    if (v === '') onChange('', null);
  }

  return (
    <div className="relative" ref={boxRef}>
      <input
        required={required}
        className="form-input"
        placeholder={placeholder}
        value={query || selectedLabel}
        onChange={(e) => handleInput(e.target.value)}
        onFocus={() => setOpen(true)}
      />
      {open && (query.length > 0) && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
          {loading ? (
            <div className="px-3 py-2 text-sm text-gray-400">Searching…</div>
          ) : results.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-400">No matches</div>
          ) : (
            results.map((item) => (
              <button
                key={item[idKey]}
                type="button"
                className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                onClick={() => select(item)}
              >
                {labelFn(item)}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}