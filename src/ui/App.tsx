import { useEffect, useRef, useState } from 'react';
import { solveGrid, type Grid, type SolveResult } from '../core';
import { transcribePhoto } from '../ocr/client';
import { scannedTableToGrid } from '../ocr/toGrid';
import { SpeedTable } from './SpeedTable';
import { plural } from './format';

interface Done {
  grid: Grid;
  result: SolveResult;
}

type State =
  | { status: 'idle' }
  | { status: 'reading' }
  | { status: 'done'; done: Done }
  | { status: 'error'; message: string };

/** The last result survives a reload, so it stays readable without signal. */
const STORAGE_KEY = 'rally-tijdtabel:last';

function loadLast(): Done | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const grid = (JSON.parse(raw) as { grid: Grid }).grid;
    return { grid, result: solveGrid(grid) };
  } catch {
    return null;
  }
}

export function App() {
  const [state, setState] = useState<State>({ status: 'idle' });
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const last = loadLast();
    if (last) setState({ status: 'done', done: last });
  }, []);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setState({ status: 'reading' });
    try {
      const table = await transcribePhoto(file);
      const grid = scannedTableToGrid(table);
      const result = solveGrid(grid);
      if (result.segments.length === 0) {
        throw new Error('Geen leesbare tijdtabel gevonden. Probeer een scherpere foto.');
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ grid }));
      setState({ status: 'done', done: { grid, result } });
    } catch (error) {
      setState({
        status: 'error',
        message: error instanceof Error ? error.message : 'Onbekende fout.',
      });
    }
  }

  const done = state.status === 'done' ? state.done : null;
  // Only surfaced when the scan and the derived speeds actually disagree.
  const unexplained = done ? done.result.mismatches.length + done.result.discarded.length : 0;

  return (
    <main className="app">
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(event) => {
          void handleFile(event.target.files?.[0]);
          event.target.value = '';
        }}
      />

      {done && <SpeedTable segments={done.result.segments} />}

      {unexplained > 0 && (
        <p className="warning" role="status">
          {plural(unexplained, 'cel', 'cellen')} op de foto {unexplained === 1 ? 'past' : 'passen'}{' '}
          niet bij deze snelheden — controleer het blad.
        </p>
      )}

      {state.status === 'reading' ? (
        <p className="status" role="status">
          <span className="spinner" aria-hidden="true" />
          Tabel wordt gelezen…
        </p>
      ) : (
        <button className="primary" onClick={() => fileInput.current?.click()}>
          {done ? 'Nieuwe tabel fotograferen' : 'Tijdtabel fotograferen'}
        </button>
      )}

      {state.status === 'error' && (
        <p className="status error" role="alert">
          {state.message}
        </p>
      )}
    </main>
  );
}
