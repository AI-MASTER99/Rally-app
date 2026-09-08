import { useEffect, useRef, useState } from 'react';
import { transcribePhoto } from '../ocr/client';
import { interpretSheet, type Interpretation } from '../ocr/interpret';
import { ScannedSheetSchema, type ScannedSheet } from '../ocr/schema';
import { SpeedTable } from './SpeedTable';
import { plural } from './format';

type State =
  | { status: 'idle' }
  | { status: 'reading' }
  | { status: 'done'; result: Interpretation }
  | { status: 'error'; message: string };

/** The last sheet survives a reload, so its speeds stay readable without signal. */
const STORAGE_KEY = 'rally-tijdtabel:last';

function loadLast(): Interpretation | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    // Re-derive rather than store the answer: the sheet is the source of truth.
    const sheet = ScannedSheetSchema.safeParse(JSON.parse(raw));
    return sheet.success ? interpretSheet(sheet.data) : null;
  } catch {
    return null;
  }
}

export function App() {
  const [state, setState] = useState<State>({ status: 'idle' });
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const last = loadLast();
    if (last) setState({ status: 'done', result: last });
  }, []);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setState({ status: 'reading' });
    try {
      const sheet: ScannedSheet = await transcribePhoto(file);
      const result = interpretSheet(sheet);
      if (result.segments.length === 0) {
        throw new Error('Geen leesbare tijdtabel of roadbook gevonden. Probeer een scherpere foto.');
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sheet));
      setState({ status: 'done', result });
    } catch (error) {
      setState({
        status: 'error',
        message: error instanceof Error ? error.message : 'Onbekende fout.',
      });
    }
  }

  const result = state.status === 'done' ? state.result : null;

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

      {result && <SpeedTable segments={result.segments} uncertain={result.uncertain} />}

      {/* Only shown when the sheet and the derived speeds actually disagree. */}
      {result && result.unexplained > 0 && (
        <p className="warning" role="status">
          {plural(result.unexplained, 'regel', 'regels')} op de foto{' '}
          {result.unexplained === 1 ? 'past' : 'passen'} niet bij deze snelheden — controleer het
          blad.
        </p>
      )}
      {result && result.uncertain.length > 0 && (
        <p className="warning" role="status">
          Bij ± staan de tijden te grof op het blad om de snelheid op één km/u vast te leggen.
        </p>
      )}

      {state.status === 'reading' ? (
        <p className="status" role="status">
          <span className="spinner" aria-hidden="true" />
          Blad wordt gelezen…
        </p>
      ) : (
        <button className="primary" onClick={() => fileInput.current?.click()}>
          {result ? 'Nieuwe tabel fotograferen' : 'Tijdtabel fotograferen'}
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
