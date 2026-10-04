# CZ-101 SysEx notes for the MVP

This file exists so future work does not bury protocol assumptions inside UI code.

## Transaction used by “Send to CZ current sound”

The original documented receive-request flow for the temporary/current-sound program number `0x60` is shown below. The browser app sends a complete frame instead, as explained under “Web MIDI note”:

```text
Computer -> CZ: F0 44 00 00 7n 20 60
CZ -> Computer: F0 44 00 00 7n 30
Computer -> CZ: <256 nibble tone bytes> F7
CZ -> Computer: F7
```

`n` is MIDI channel 0..15.

## Tone data

The documented CZ-101 tone payload is 128 logical bytes grouped into 25 sections:

1. pflag (line select + octave)
2. detune direction
3. detune fine + octave/note
4. vibrato waveform
5–7. vibrato delay/rate/depth encodings
8–16. Line 1 wave, key follow and DCA/DCW/DCO envelopes
17–25. Line 2 equivalents

Every logical byte is transmitted as two MIDI-safe nibbles, **low nibble first**. Example logical `0x5F` becomes `0x0F 0x05`.

## Verification requirement

The encoder covers the documented fields needed by the initial JSON model. Before using this as archival truth, add tests against known-good `.syx` dumps and verify one or more patches on the real CZ-101. Keep protocol changes in `src/cz101-sysex.js`.


## Web MIDI note: CZ streaming handshake

The original CZ-101 documentation describes remote programming as a streamed System Exclusive dialogue where the opening `F0` and closing `F7` can be separated by replies from the synthesizer. Browser Web MIDI does not allow `MIDIOutput.send()` to transmit an unterminated SysEx fragment: a call beginning with `F0` must contain its final `F7`.

For browser transmission this MVP therefore uses the complete `.syx` representation commonly used by CZ librarians:

`F0 44 00 00 7n 20 pp <256 nibble bytes> F7`

`pp = 60` targets the temporary/current sound. This is suitable for SEND. Receiving a patch from the CZ may require a different strategy because the documented read transaction is interactive/streamed.


## Auto MIDI audition

Auto always sends the complete tone frame with `pp = 0x60`, regardless of the patch's assigned INTERNAL destination. After 150 ms without a new edit it sends the frame, waits another 150 ms for tone reception, and sends `90 | n, 3C, 64` (C4, velocity 100). One second after Note On it sends `80 | n, 3C, 00` (Note Off). Here `n` is the selected zero-based MIDI channel; values shown are hexadecimal.

Pending sends are canceled on a new edit or context change. An active Auto note is released on its original output/channel before retriggering or stopping. Missing MIDI output and active batch sending skip the audition. The delay is fixed; Auto does not wait for an ACK or otherwise verify hardware reception. Scheduling is isolated in `src/auto-audition.js`; tone encoding remains in `src/cz101-sysex.js`.
