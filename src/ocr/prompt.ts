/**
 * The transcription prompt.
 *
 * The model's only job is to read the cells. Every inference — where the
 * speeds change, what they are, which cells are misread — happens afterwards
 * in `src/core`, deterministically and against the whole table at once. A
 * model that "helpfully" completes a row it cannot read would defeat that, so
 * the prompt is emphatic about transcribing and nothing else.
 */
export const TRANSCRIBE_PROMPT = `You are transcribing a rally time table from a photograph.

Layout of these sheets:
- The row header is the distance in whole kilometres since the start (0, 1, 2, ...).
- The ten columns are hundreds of metres: 0, 0.1, 0.2 ... 0.9.
- So the cell in row 3, column 0.7 is the elapsed time at 3.7 km.
- Cells hold an elapsed time since the start, printed as MM:SS.S (sometimes H:MM:SS.S).

Transcribe every cell of the main time table, exactly as printed.

Rules:
- The photo may be rotated, skewed, creased or lit unevenly. Orient yourself by the
  headers before reading, and read straight through a fold.
- Report each row as ten cells in column order 0.0 to 0.9. Use "" for a cell that is
  blank on the sheet.
- Include every row from 0 up to and including the last row that has any value.
  Rows printed but left entirely empty become ten "" cells.
- Copy the digits you actually see. Do NOT compute, correct, interpolate or complete
  anything. If a cell is unreadable, return "" for it rather than a guess.
- Keep the printed punctuation of each time, including the decimal.
- Ignore anything outside the main grid: the header, the logo, and in particular any
  small summary table of average speeds. That summary is the answer we are deriving
  and must not be transcribed.
- Set "title" to the table's printed name (for example "Time Table RT 10"), or "" if
  there is none.`;
