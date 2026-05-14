import { useState, useCallback, useMemo } from 'react';
import { useLocalStorageState } from './useLocalStorageState';
import { KEYS } from '../utils/storage';

// ── useSavedLookups ──────────────────────────────────────────────────────────
// Owns the saved list + filter + the per-item note-editing state. Filter now
// also matches against the note text (used to be year/make/model only).
export function useSavedLookups() {
  const [saved, setSaved] = useLocalStorageState(KEYS.saved, []);
  const [filter, setFilter] = useState('');
  const [editingNoteId,   setEditingNoteId]   = useState('');
  const [editingNoteText, setEditingNoteText] = useState('');

  const idOf = (s) => `${s.year}-${s.make}-${s.model}`;

  const isSaved = useCallback((vehicle) =>
    !!vehicle && saved.some(s =>
      s.year === vehicle.year && s.make === vehicle.make && s.model === vehicle.model
    ),
  [saved]);

  const saveEntry = useCallback((vehicle, result) => {
    if (!vehicle || !result) return;
    setSaved(prev => [
      { ...vehicle, result, ts: Date.now() },
      ...prev.filter(s =>
        !(s.year === vehicle.year && s.make === vehicle.make && s.model === vehicle.model)
      ),
    ].slice(0, 30));
  }, [setSaved]);

  const deleteEntry = useCallback((year, make, model) => {
    setSaved(prev => prev.filter(s =>
      !(s.year === year && s.make === make && s.model === model)
    ));
  }, [setSaved]);

  const startEditNote = useCallback((item) => {
    setEditingNoteId(idOf(item));
    setEditingNoteText(item.note || '');
  }, []);

  const commitNote = useCallback((id) => {
    setSaved(prev => prev.map(s => idOf(s) === id ? { ...s, note: editingNoteText.trim() } : s));
    setEditingNoteId('');
    setEditingNoteText('');
  }, [editingNoteText, setSaved]);

  // Filter matches year/make/model AND note text.
  const filtered = useMemo(() => {
    const q = filter.toLowerCase();
    if (!q) return saved;
    return saved.filter(s => {
      const haystack = `${s.year} ${s.make} ${s.model} ${s.note || ''}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [saved, filter]);

  return {
    saved,
    filtered,
    filter,
    setFilter,
    isSaved,
    saveEntry,
    deleteEntry,
    editingNoteId,
    editingNoteText,
    setEditingNoteText,
    startEditNote,
    commitNote,
  };
}
