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
- Web MIDI connection with SysEx permission
- Send a patch to the temporary/edit buffer (`0x60`) by default, or optionally to an assigned INTERNAL 1–16 slot
- SysEx codec isolated in `src/cz101-sysex.js`

No framework and no backend.

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
