# CZ-101 Web Librarian — MVP

Vanilla HTML/CSS/JavaScript librarian/editor for the Casio CZ-101.

## MVP scope

- CRUD of patches in browser storage (`localStorage`)
- JSON import/export
- Visual drag editor for the 6 CZ envelopes (DCO/DCW/DCA × Line 1/2)
- Sustain / End step markers
- Basic CZ parameters (line select, octave, detune, vibrato, waves, key follow)
- Only the line editor(s) selected by Line select are shown; Line 1 + Line 1′ uses the Line 1 editor
- CZ waveform reference and responsive editor layout
- Extensive Spanish sound-design help for waves/PD, envelopes, key follow, modulation, detune and vibrato
- Experimental local PD audio preview for studying DCO/DCW/DCA envelopes on Saw/Square bases
- Per-patch session Undo/Redo and temporary read-only A/B reference comparison
- Web MIDI connection with SysEx permission
- Send a patch to the temporary/edit buffer (`0x60`) by default, or optionally to an assigned INTERNAL 1–16 slot
- SysEx codec isolated in `src/cz101-sysex.js`

No framework and no backend.

## Sound-design help

Hover over a **?** icon to read detailed explanations and sound-design suggestions. Hovering over labels or input controls does not open help. Click or tap **?** to keep the bubble open; use its scroll area for longer guides and close it with **×**, Escape, or a click outside. Keyboard users can focus **?** and press Enter or Space, then Tab into the scrollable content. Envelope guides include Rate, Level, Sustain and End without adding stops between the numerical inputs. The help links to the original CZ-101 operation manual and distinguishes the editor's relative timing diagram from hardware envelope timing.

## Run

Web MIDI requires a secure context. For local development Chromium treats localhost as secure:

```bash
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080
```

Use Chrome/Chromium and grant MIDI/SysEx permission.

## Experimental PD Preview

The **PD Preview** card produces browser audio without MIDI. Choose the visible line to study, a base note, and either its **Wave 1** (currently only 1/2) or a separate **Saw/Square reference**. Reference bases and preview settings do not modify the stored patch. **Play / retrigger** starts the note, **Release** lets its envelopes enter their release stages, and **Stop** ends the sound with a short fade. Patch/line changes and leaving the window stop playback; each note has a one-minute limit.

The DCO/DCW/DCA checkboxes bypass envelopes only for audition: DCO bypass keeps the base pitch, DCW bypass keeps full PD depth, and DCA bypass keeps constant amplitude until release. Patch envelope changes apply after confirming an input or finishing a node drag; retrigger to hear the modified attack. The general Octave setting applies to the base note.

This is an educational approximation, **not a faithful CZ-101 emulator**: waveform phase mappings, pitch-level scaling and envelope rate/timing are not calibrated to the hardware. It is monophonic and does not yet render Wave 2, waves 3–8, two-line layering, Key Follow, Detune, Vibrato or Ring/Noise. Unsupported Wave 1 values are reported explicitly; choose a reference base to study their envelopes. The audio engine runs in an isolated AudioWorklet (`src/preview-worklet.js`) with shared pure DSP (`src/preview-dsp.js`). HTTPS or localhost is required.

Run the DSP regression checks with:

```bash
node tests/preview-dsp.test.mjs
```

## Undo/Redo and A/B

The editor keeps up to 100 parameter-edit steps per patch during a session. Continuous typing in a field is grouped; envelope changes and node drags are discrete steps. Undo/Redo restore the saved working patch. New, Duplicate, Delete and Import are not history actions. Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z and Ctrl+Y work outside inputs; inputs retain native text-editing undo. A new edit after Undo clears Redo.

**B → A** captures the working patch as a temporary reference. **A** shows that reference read-only; **B** shows the editable, autosaved working patch. Switching patches preserves their session references and histories; reload/import clears them. Switching A/B retriggers a playing browser preview. **Send to CZ sends the visible version** (the button reads **Send A to CZ** in A), using its displayed destination and the existing INTERNAL confirmation. Switching versions never sends MIDI automatically. JSON exports and Send ALL continue to use the stored working versions B; references and histories never enter the patch schema.

## Important CZ-101 setup

- MIDI IN from the computer/interface must be connected.
- MIDI OUT from the CZ is optional for sending patches; connect it to a computer MIDI input to use the incoming MIDI monitor.
- MIDI channel in the app must match the CZ receive channel.
- Enable the CZ MIDI/SysEx programming mode as required by the instrument.
- **Destination defaults to Edit buffer (`0x60`)**, which does not intentionally overwrite an internal memory slot. Selecting INTERNAL 1–16 writes directly to that slot after an explicit confirmation. Set the CZ's MEMORY PROTECT to OFF for an INTERNAL write.

## Patch destinations

Each patch has an optional Destination selector next to Name. **Edit buffer** is the default for new patches and for older libraries without a destination. No destination value needs to be stored for this default. Choosing **Internal 1–16** stores the slot in `meta.internalDestination`; duplication and JSON export/import preserve it. Invalid imported slot values fall back to Edit buffer.

`Send to CZ` maps Edit buffer to program byte `0x60` and Internal 1–16 to `0x20`–`0x2F`. An INTERNAL send asks for confirmation because it can overwrite the patch already in that slot. The MIDI log records the destination before transmission.

## Architecture

```text
UI / envelope SVG
       │
       ▼
 Patch JSON  <──> localStorage / import / export
       │
       ▼
 cz101-sysex.js
       │
       ▼
 Web MIDI output
```

GitHub persistence is deliberately left out of this first wave. It can be added later behind a repository adapter without changing the patch model.

## Protocol note

The CZ-101 encodes a tone as 128 logical bytes, transmitted as 256 nibbles (low nibble first). The protocol adapter is intentionally kept separate and heavily commented because this is the piece that should be verified against known-good dumps and the real keyboard before growing the app.

Primary technical references used for this scaffold:

- Casio CZ MIDI/SysEx notes preserved at Young Monkey.
- CZSYSEXY documentation by Michael Rickard / Kasploosh.

## Suggested next steps for Codex

1. Add receive/request and decode from CZ → JSON.
2. Add golden-vector tests using known `.syx` patch dumps.
3. Improve waveform/modulation UI and exact hidden-feature coverage.
4. Add bank management and bulk operations.
5. Add GitHub repository adapter as an optional persistence backend.
6. Add undo/redo and A/B patch comparison.


## MIDI debug

Expand **MIDI debug / protocol log** to access the incoming MIDI monitor and diagnostic actions:

- **Send C4**: sends Note On/Off on the selected MIDI channel to test browser → MIDI interface → CZ.
- **Set A440**: sends CC 6 = 64 on the selected MIDI channel to center the CZ-101 Master Tune.
- **SysEx smoke test**: sends a complete Casio SysEx frame to check that Web MIDI accepts the transmission. It does not wait for an ACK.
- **Load raw .syx / Send raw → edit buffer**: validates and sends a raw tone frame as described below.
- **Clear**: clears the MIDI log. Incoming bytes from the selected MIDI input, including notes and SysEx, are logged continuously while connected.

`Send to CZ` also uses a complete SysEx frame. A successful send means Web MIDI accepted the message; the app does not verify that the CZ received or applied it. Unlike the documented interactive CZ handshake, this browser implementation does not wait for a reply from the keyboard.


## Raw `.syx` validation / safe test path

The MIDI debug panel can load a raw CZ-101-compatible `.syx` timbre frame and send it unchanged except for two deliberately sanitized bytes:

- MIDI channel is rewritten to the channel selected in the UI.
- Program/target is always rewritten to `0x60`, the CZ temporary/edit buffer.

The loader refuses files unless they are exactly 264 bytes, have the Casio CZ header, command `0x20`, a complete `F0...F7` frame, and a 256-byte nibblized payload (`00..0F`). This prevents accidentally sending arbitrary SysEx or writing a loaded file directly into an internal-memory slot.
