from __future__ import annotations

import argparse
import json
from collections import defaultdict, deque
from dataclasses import asdict, dataclass
from pathlib import Path
from statistics import fmean, pstdev

import mido


@dataclass(frozen=True)
class OnsetGap:
    start_seconds: float
    end_seconds: float
    duration_seconds: float


@dataclass(frozen=True)
class MidiAnalysis:
    format_type: int
    track_count: int
    ticks_per_beat: int
    channels: tuple[int, ...]
    note_count: int
    pitch_min: int | None
    pitch_min_name: str | None
    pitch_max: int | None
    pitch_max_name: str | None
    velocity_min: int | None
    velocity_max: int | None
    velocity_mean: float | None
    velocity_std: float | None
    mean_key_hold_seconds: float | None
    unmatched_note_on_count: int
    duration_seconds: float
    playing_span_seconds: float | None
    tempo_event_count: int
    pedal_event_count: int
    pedal_down_count: int
    pedal_up_count: int
    longest_onset_gap_seconds: float | None
    long_onset_gaps: tuple[OnsetGap, ...]


@dataclass(frozen=True)
class ManifestEntry:
    id: str
    path: Path
    original_file: str
    piece: str
    take: str
    source_device: str


def pitch_name(note: int) -> str:
    names = ("C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B")
    return f"{names[note % 12]}{note // 12 - 1}"


def load_manifest(path: str | Path) -> tuple[ManifestEntry, ...]:
    manifest_path = Path(path).resolve()
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if manifest.get("schema_version") != 1:
        raise ValueError("manifest schema_version must be 1")

    return tuple(
        ManifestEntry(
            id=recording["id"],
            path=(manifest_path.parent / recording["file"]).resolve(),
            original_file=recording["original_file"],
            piece=recording["piece"],
            take=recording["take"],
            source_device=recording["source_device"],
        )
        for recording in manifest["recordings"]
    )


def analyze_midi(
    path: str | Path,
    *,
    pause_threshold_seconds: float = 1.0,
) -> MidiAnalysis:
    if pause_threshold_seconds < 0:
        raise ValueError("pause_threshold_seconds must be non-negative")

    midi = mido.MidiFile(path)
    if midi.ticks_per_beat <= 0:
        raise ValueError("SMPTE time division is not supported; use a PPQ-timed MIDI file")

    current_tempo = 500_000
    current_seconds = 0.0
    pitches: list[int] = []
    velocities: list[int] = []
    channels: set[int] = set()
    key_hold_seconds: list[float] = []
    active_notes: dict[tuple[int, int], deque[float]] = defaultdict(deque)
    onset_seconds: list[float] = []
    first_onset_seconds: float | None = None
    last_note_end_seconds: float | None = None
    tempo_event_count = 0
    pedal_event_count = 0
    pedal_down_count = 0
    pedal_up_count = 0

    for message in mido.merge_tracks(midi.tracks):
        current_seconds += mido.tick2second(message.time, midi.ticks_per_beat, current_tempo)

        if message.is_meta:
            if message.type == "set_tempo":
                current_tempo = message.tempo
                tempo_event_count += 1
            continue

        if hasattr(message, "channel"):
            channels.add(message.channel)

        if message.type == "control_change" and message.control == 64:
            pedal_event_count += 1
            if message.value >= 64:
                pedal_down_count += 1
            else:
                pedal_up_count += 1

        if message.type == "note_on" and message.velocity > 0:
            pitches.append(message.note)
            velocities.append(message.velocity)
            active_notes[(message.channel, message.note)].append(current_seconds)
            onset_seconds.append(current_seconds)
            if first_onset_seconds is None:
                first_onset_seconds = current_seconds
            continue

        if message.type in {"note_off", "note_on"}:
            key = (message.channel, message.note)
            if active_notes[key]:
                started_at = active_notes[key].popleft()
                key_hold_seconds.append(current_seconds - started_at)
                last_note_end_seconds = current_seconds

    pitch_min = min(pitches, default=None)
    pitch_max = max(pitches, default=None)
    unmatched_note_on_count = sum(len(starts) for starts in active_notes.values())
    onset_gaps = tuple(
        OnsetGap(
            start_seconds=start,
            end_seconds=end,
            duration_seconds=end - start,
        )
        for start, end in zip(onset_seconds, onset_seconds[1:], strict=False)
    )
    longest_onset_gap_seconds = max(
        (gap.duration_seconds for gap in onset_gaps),
        default=None,
    )
    long_onset_gaps = tuple(
        gap for gap in onset_gaps if gap.duration_seconds > pause_threshold_seconds
    )
    playing_span_seconds = (
        last_note_end_seconds - first_onset_seconds
        if first_onset_seconds is not None and last_note_end_seconds is not None
        else None
    )

    return MidiAnalysis(
        format_type=midi.type,
        track_count=len(midi.tracks),
        ticks_per_beat=midi.ticks_per_beat,
        channels=tuple(sorted(channels)),
        note_count=len(pitches),
        pitch_min=pitch_min,
        pitch_min_name=pitch_name(pitch_min) if pitch_min is not None else None,
        pitch_max=pitch_max,
        pitch_max_name=pitch_name(pitch_max) if pitch_max is not None else None,
        velocity_min=min(velocities, default=None),
        velocity_max=max(velocities, default=None),
        velocity_mean=fmean(velocities) if velocities else None,
        velocity_std=pstdev(velocities) if velocities else None,
        mean_key_hold_seconds=fmean(key_hold_seconds) if key_hold_seconds else None,
        unmatched_note_on_count=unmatched_note_on_count,
        duration_seconds=current_seconds,
        playing_span_seconds=playing_span_seconds,
        tempo_event_count=tempo_event_count,
        pedal_event_count=pedal_event_count,
        pedal_down_count=pedal_down_count,
        pedal_up_count=pedal_up_count,
        longest_onset_gap_seconds=longest_onset_gap_seconds,
        long_onset_gaps=long_onset_gaps,
    )


def save_figures(entries: tuple[ManifestEntry, ...], output_directory: str | Path) -> None:
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    import pretty_midi

    output_path = Path(output_directory)
    output_path.mkdir(parents=True, exist_ok=True)
    notes_by_id = {}
    for entry in entries:
        midi = pretty_midi.PrettyMIDI(str(entry.path))
        notes_by_id[entry.id] = [
            note
            for instrument in midi.instruments
            if not instrument.is_drum
            for note in instrument.notes
        ]

    figure, axes = plt.subplots(
        len(entries),
        1,
        figsize=(12, max(2.4 * len(entries), 3.0)),
        squeeze=False,
    )
    color_map = plt.get_cmap("viridis")
    for axis, entry in zip(axes[:, 0], entries, strict=True):
        notes = notes_by_id[entry.id]
        for note in notes:
            axis.hlines(
                note.pitch,
                note.start,
                note.end,
                color=color_map(note.velocity / 127),
                linewidth=2.0,
            )
        if notes:
            axis.set_ylim(
                min(note.pitch for note in notes) - 1, max(note.pitch for note in notes) + 1
            )
        axis.set_title(entry.id)
        axis.set_xlabel("time (seconds)")
        axis.set_ylabel("MIDI pitch")
        axis.grid(alpha=0.2)
    figure.tight_layout()
    figure.savefig(output_path / "piano-rolls.png", dpi=150)
    plt.close(figure)

    figure, axis = plt.subplots(figsize=(10, 5))
    for entry in entries:
        velocities = [note.velocity for note in notes_by_id[entry.id]]
        if velocities:
            axis.hist(
                velocities,
                bins=range(0, 132, 4),
                histtype="step",
                linewidth=1.7,
                label=entry.id,
            )
    axis.set_xlabel("velocity")
    axis.set_ylabel("note count")
    axis.set_title("Velocity distributions")
    axis.grid(alpha=0.2)
    axis.legend()
    figure.tight_layout()
    figure.savefig(output_path / "velocity-distributions.png", dpi=150)
    plt.close(figure)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Analyze note, timing, velocity, and pedal data")
    parser.add_argument("midi_files", nargs="*", type=Path)
    parser.add_argument("--manifest", type=Path)
    parser.add_argument("--json", action="store_true", help="emit machine-readable JSON")
    parser.add_argument("--figures-dir", type=Path, help="write piano-roll and velocity plots")
    args = parser.parse_args(argv)

    if args.manifest is not None and args.midi_files:
        parser.error("use MIDI file paths or --manifest, not both")
    if args.manifest is None and not args.midi_files:
        parser.error("provide at least one MIDI file or --manifest")

    records = []
    if args.manifest is not None:
        manifest_path = args.manifest.resolve()
        entries = load_manifest(manifest_path)
        display_paths = [
            entry.path.relative_to(manifest_path.parent).as_posix() for entry in entries
        ]
    else:
        entries = tuple(
            ManifestEntry(
                id=path.stem,
                path=path.resolve(),
                original_file=path.name,
                piece="",
                take="",
                source_device="",
            )
            for path in args.midi_files
        )
        display_paths = [entry.path.name for entry in entries]

    if args.figures_dir is not None:
        save_figures(entries, args.figures_dir)

    for entry, display_path in zip(entries, display_paths, strict=True):
        records.append(
            {
                "id": entry.id,
                "file": display_path,
                "original_file": entry.original_file,
                "piece": entry.piece,
                "take": entry.take,
                "source_device": entry.source_device,
                "analysis": asdict(analyze_midi(entry.path)),
            }
        )

    if args.json:
        print(json.dumps(records, ensure_ascii=False, indent=2, sort_keys=True))
    else:
        print(
            "id\tnotes\tspan_s\tpitch_range\tvelocity_mean\tvelocity_std"
            "\tpedal_events\tlong_onset_gaps"
        )
        for record in records:
            analysis = record["analysis"]
            pitch_range = (
                f"{analysis['pitch_min_name']}-{analysis['pitch_max_name']}"
                if analysis["pitch_min_name"] is not None
                else "-"
            )
            span = analysis["playing_span_seconds"]
            velocity_mean = analysis["velocity_mean"]
            velocity_std = analysis["velocity_std"]
            print(
                "\t".join(
                    [
                        record["id"],
                        str(analysis["note_count"]),
                        f"{span:.3f}" if span is not None else "-",
                        pitch_range,
                        f"{velocity_mean:.2f}" if velocity_mean is not None else "-",
                        f"{velocity_std:.2f}" if velocity_std is not None else "-",
                        str(analysis["pedal_event_count"]),
                        str(len(analysis["long_onset_gaps"])),
                    ]
                )
            )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
