import { useEffect, useRef, useState } from 'react';
import { solveGrid, type Grid, type SolveResult } from '../core';
import { transcribePhoto } from '../ocr/client';
import { scannedTableToGrid } from '../ocr/toGrid';
import { CheckPanel } from './CheckPanel';
import { SpeedTable } from './SpeedTable';
import { km } from './format';

interface Done {
  title: string;
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
    const saved = JSON.parse(raw) as { title: string; grid: Grid };
    return { title: saved.title, grid: saved.grid, result: solveGrid(saved.grid) };
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
      const done: Done = { title: table.title, grid, result };
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ title: done.title, grid }));
      setState({ status: 'done', done });
    } catch (error) {
      setState({ status: 'error', message: error instanceof Error ? error.message : 'Onbekende fout.' });
    }
  }

  return (
    <main className="app">
      <header>
        <h1>Rally Tijdtabel</h1>
        <p className="sub">Foto van de tijdtabel in, gemiddelde snelheden uit.</p>
      </header>

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

      {state.status === 'reading' ? (
        <p className="status" role="status">
          <span className="spinner" aria-hidden="true" />
          Tabel wordt gelezen…
        </p>
      ) : (
        <button className="primary" onClick={() => fileInput.current?.click()}>
          {state.status === 'done' ? 'Nieuwe tabel fotograferen' : 'Tijdtabel fotograferen'}
        </button>
      )}

      {state.status === 'error' && (
        <p className="status error" role="alert">
          {state.message}
        </p>
      )}

      {state.status === 'done' && (
        <>
          {state.done.title && <h2 className="title">{state.done.title}</h2>}
          <SpeedTable segments={state.done.result.segments} />
          <p className="route">Traject tot {km(state.done.result.routeEndKm)} km.</p>
          <CheckPanel grid={state.done.grid} result={state.done.result} />
        </>
      )}
    </main>
  );
}
