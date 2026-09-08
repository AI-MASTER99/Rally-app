/**
 * The transcription prompt.
 *
 * The model's only job is to read the sheet. Every inference — where the
 * speeds change, what they are, which cells are misread — happens afterwards
 * in `src/core`, deterministically. A model that "helpfully" completes a row
 * it cannot read would defeat that, so the prompt is emphatic about
 * transcribing and nothing else. Converting a printed distance to metres is
 * the one exception: that is reading a unit, not inferring a schedule.
 */
export const TRANSCRIBE_PROMPT = `You are transcribing a rally route sheet from a photograph.

Two kinds of sheet occur. Decide which one this is and set "kind" accordingly.

TIME TABLE ("kind": "timetable")
A grid of elapsed times. The row header is the distance in whole kilometres since
the start (0, 1, 2, ...) and the ten columns are hundreds of metres: 0, 0.1 ... 0.9.
So row 3, column 0.7 is the elapsed time at 3.7 km. Cells hold the elapsed time
since the start as MM:SS.S, sometimes H:MM:SS.S.

Fill "rows", leave "legs" empty.
- Report each row as ten cells in column order 0.0 to 0.9, using "" for a blank cell.
- Include every row from 0 up to and including the last row that has any value.
  A row printed but left empty becomes ten "" cells.

ROAD BOOK ("kind": "roadbook")
A list of route instructions, each with a distance and a time, for example
"600m naar rechts 1:11" or "0.60 right at the church 1:11".

Fill "legs" in the printed order, leave "rows" empty.
- "distanceMetres": the printed distance converted to metres (0.60 km -> 600, 600m -> 600).
- "instruction": the route instruction as printed, without the distance and time.
- "time": the elapsed time since the start of the route, exactly as printed.
- Set "distanceKind" to "cumulative" if the distance column counts from the start of
  the route (the values increase down the sheet, often headed "totaal" or "total"),
  or "leg" if each value is the length of that one leg. Read the column header and
  the values to decide. For a time table, set it to "leg"; it is not used there.

Rules for both:
- The photo may be rotated, skewed, creased or lit unevenly. Orient yourself by the
  headers before reading, and read straight through a fold.
- Copy what you actually see. Do NOT compute, correct, interpolate or complete
  anything. If something is unreadable, return "" for it rather than a guess.
- Keep the printed punctuation of each time, including the decimal.
- Ignore anything outside the main table or list: the header, the logo, and in
  particular any small summary table of average speeds. That summary is the answer
  we are deriving and must not be transcribed.
- Set "title" to the sheet's printed name (for example "Time Table RT 10"), or "".`;
