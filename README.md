# CZ-101 Web Librarian — MVP

Vanilla HTML/CSS/JavaScript librarian/editor for the Casio CZ-101.

## MVP scope

- CRUD of patches in browser storage (`localStorage`)
- JSON import/export
- Visual drag editor for the 6 CZ envelopes (DCO/DCW/DCA × Line 1/2)
- Sustain / End step markers
- Basic CZ parameters (line select, octave, detune, vibrato, waves, key follow)
- Web MIDI connection with SysEx permission
- Send current patch to a CZ-101 through the temporary sound area (`0x60`)
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
- For the handshake used by the CZ protocol, MIDI OUT from the CZ should also return to the computer/interface.
- MIDI channel in the app must match the CZ receive channel.
- Enable the CZ MIDI/SysEx programming mode as required by the instrument.
- The MVP sends to **CURRENT SOUND / temporary area (`0x60`)**, so experimenting does not intentionally overwrite an internal memory slot.

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
 Web MIDI + CZ handshake
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
4. Add bank management and slot assignment.
5. Add GitHub repository adapter as an optional persistence backend.
6. Add undo/redo and A/B patch comparison.


## MIDI debug

The UI includes a permanent raw MIDI monitor and two diagnostic actions:

- **Send C4**: sends Note On/Off on the selected MIDI channel. This verifies browser → USB MIDI → CZ.
- **Handshake test**: sends only the CZ current-sound receive request and waits up to 5 seconds for the ACK. It does **not** send tone data.
- Incoming bytes from the selected MIDI input are logged continuously, including ordinary notes and SysEx.

Recommended diagnostic order: CZ → browser Note On, browser → CZ C4, then SysEx handshake.


## Raw `.syx` validation / safe test path

The MIDI debug panel can load a raw CZ-101-compatible `.syx` timbre frame and send it unchanged except for two deliberately sanitized bytes:

- MIDI channel is rewritten to the channel selected in the UI.
- Program/target is always rewritten to `0x60`, the CZ temporary/edit buffer.

The loader refuses files unless they are exactly 264 bytes, have the Casio CZ header, command `0x20`, a complete `F0...F7` frame, and a 256-byte nibblized payload (`00..0F`). This prevents accidentally sending arbitrary SysEx or writing a loaded file directly into an internal-memory slot.
