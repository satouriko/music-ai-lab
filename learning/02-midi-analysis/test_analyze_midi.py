import importlib.util
import json
import subprocess
import sys
from pathlib import Path
from types import ModuleType

import mido
import pytest

SCRIPT = Path(__file__).with_name("analyze_midi.py")


def load_analysis_module() -> ModuleType:
    assert SCRIPT.exists(), f"Missing MIDI analysis module: {SCRIPT}"
    spec = importlib.util.spec_from_file_location("midi_analysis", SCRIPT)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def test_analyze_midi_decodes_notes_pitch_velocity_and_key_hold_time(
    tmp_path: Path,
) -> None:
    analysis_module = load_analysis_module()
    midi_path = tmp_path / "notes.mid"
    midi = mido.MidiFile(type=0, ticks_per_beat=480)
    track = mido.MidiTrack()
    midi.tracks.append(track)
    track.append(mido.MetaMessage("set_tempo", tempo=500_000, time=0))
    track.append(mido.Message("note_on", channel=0, note=60, velocity=80, time=0))
    track.append(mido.Message("note_on", channel=0, note=60, velocity=0, time=480))
    track.append(mido.Message("note_on", channel=0, note=64, velocity=100, time=0))
    track.append(mido.Message("note_off", channel=0, note=64, velocity=0, time=240))
    track.append(mido.MetaMessage("end_of_track", time=0))
    midi.save(midi_path)

    result = analysis_module.analyze_midi(midi_path)

    assert result.format_type == 0
    assert result.track_count == 1
    assert result.ticks_per_beat == 480
    assert result.channels == (0,)
    assert result.note_count == 2
    assert result.pitch_min == 60
    assert result.pitch_min_name == "C4"
    assert result.pitch_max == 64
    assert result.pitch_max_name == "E4"
    assert result.velocity_min == 80
    assert result.velocity_max == 100
    assert result.velocity_mean == pytest.approx(90.0)
    assert result.velocity_std == pytest.approx(10.0)
    assert result.mean_key_hold_seconds == pytest.approx(0.375)
    assert result.unmatched_note_on_count == 0


def test_analyze_midi_applies_tempo_changes_and_reports_pedal_and_long_onset_gaps(
    tmp_path: Path,
) -> None:
    analysis_module = load_analysis_module()
    midi_path = tmp_path / "timing.mid"
    midi = mido.MidiFile(type=0, ticks_per_beat=480)
    track = mido.MidiTrack()
    midi.tracks.append(track)
    track.append(mido.MetaMessage("set_tempo", tempo=500_000, time=0))
    track.append(mido.Message("control_change", channel=0, control=64, value=127, time=0))
    track.append(mido.Message("note_on", channel=0, note=60, velocity=80, time=0))
    track.append(mido.Message("note_off", channel=0, note=60, velocity=0, time=480))
    track.append(mido.MetaMessage("set_tempo", tempo=1_000_000, time=0))
    track.append(mido.Message("note_on", channel=0, note=64, velocity=90, time=480))
    track.append(mido.Message("note_off", channel=0, note=64, velocity=0, time=240))
    track.append(mido.Message("control_change", channel=0, control=64, value=0, time=0))
    track.append(mido.MetaMessage("end_of_track", time=240))
    midi.save(midi_path)

    result = analysis_module.analyze_midi(midi_path, pause_threshold_seconds=1.0)

    assert result.duration_seconds == pytest.approx(2.5)
    assert result.playing_span_seconds == pytest.approx(2.0)
    assert result.tempo_event_count == 2
    assert result.pedal_event_count == 2
    assert result.pedal_down_count == 1
    assert result.pedal_up_count == 1
    assert result.longest_onset_gap_seconds == pytest.approx(1.5)
    assert len(result.long_onset_gaps) == 1
    assert result.long_onset_gaps[0].start_seconds == pytest.approx(0.0)
    assert result.long_onset_gaps[0].end_seconds == pytest.approx(1.5)
    assert result.long_onset_gaps[0].duration_seconds == pytest.approx(1.5)


def test_analyze_midi_rejects_smpte_time_division(tmp_path: Path) -> None:
    analysis_module = load_analysis_module()
    midi_path = tmp_path / "smpte.mid"
    midi = mido.MidiFile(type=0, ticks_per_beat=(-25 << 8) | 40)
    track = mido.MidiTrack()
    midi.tracks.append(track)
    track.append(mido.Message("note_on", channel=0, note=60, velocity=80, time=0))
    track.append(mido.Message("note_off", channel=0, note=60, velocity=0, time=40))
    track.append(mido.MetaMessage("end_of_track", time=0))
    midi.save(midi_path)

    with pytest.raises(ValueError, match="SMPTE time division is not supported"):
        analysis_module.analyze_midi(midi_path)


def test_load_manifest_resolves_samples_relative_to_the_manifest(tmp_path: Path) -> None:
    analysis_module = load_analysis_module()
    samples_directory = tmp_path / "samples"
    samples_directory.mkdir()
    sample_path = samples_directory / "take.mid"
    sample_path.write_bytes(b"MIDI fixture placeholder")
    manifest_path = tmp_path / "manifest.json"
    manifest_path.write_text(
        json.dumps(
            {
                "schema_version": 1,
                "recordings": [
                    {
                        "id": "beyer-059-clean",
                        "file": "samples/take.mid",
                        "original_file": "USERSONG003.MID",
                        "piece": "拜厄 59",
                        "take": "完整版本",
                        "source_device": "Yamaha CLP-835",
                    }
                ],
            }
        ),
        encoding="utf-8",
    )

    entries = analysis_module.load_manifest(manifest_path)

    assert len(entries) == 1
    assert entries[0].id == "beyer-059-clean"
    assert entries[0].path == sample_path.resolve()
    assert entries[0].original_file == "USERSONG003.MID"
    assert entries[0].piece == "拜厄 59"
    assert entries[0].take == "完整版本"
    assert entries[0].source_device == "Yamaha CLP-835"


def test_cli_reads_manifest_and_emits_deterministic_json(tmp_path: Path) -> None:
    samples_directory = tmp_path / "samples"
    samples_directory.mkdir()
    midi_path = samples_directory / "take.mid"
    midi = mido.MidiFile(type=0, ticks_per_beat=480)
    track = mido.MidiTrack()
    midi.tracks.append(track)
    track.append(mido.MetaMessage("set_tempo", tempo=500_000, time=0))
    track.append(mido.Message("note_on", channel=0, note=60, velocity=80, time=0))
    track.append(mido.Message("note_off", channel=0, note=60, velocity=0, time=480))
    track.append(mido.MetaMessage("end_of_track", time=0))
    midi.save(midi_path)
    manifest_path = tmp_path / "manifest.json"
    manifest_path.write_text(
        json.dumps(
            {
                "schema_version": 1,
                "recordings": [
                    {
                        "id": "one-note",
                        "file": "samples/take.mid",
                        "original_file": "USERSONG001.MID",
                        "piece": "单音测试",
                        "take": "测试",
                        "source_device": "Yamaha CLP-835",
                    }
                ],
            }
        ),
        encoding="utf-8",
    )
    command = [
        sys.executable,
        str(SCRIPT),
        "--manifest",
        str(manifest_path),
        "--json",
    ]

    first = subprocess.run(command, capture_output=True, check=False, text=True)
    second = subprocess.run(command, capture_output=True, check=False, text=True)

    assert first.returncode == 0, first.stderr
    assert second.returncode == 0, second.stderr
    assert first.stdout == second.stdout
    records = json.loads(first.stdout)
    assert records[0]["id"] == "one-note"
    assert records[0]["piece"] == "单音测试"
    assert records[0]["file"] == "samples/take.mid"
    assert records[0]["analysis"]["note_count"] == 1
    assert records[0]["analysis"]["duration_seconds"] == pytest.approx(0.5)


def test_cli_accepts_a_single_midi_file_and_prints_a_summary_table(tmp_path: Path) -> None:
    midi_path = tmp_path / "take.mid"
    midi = mido.MidiFile(type=0, ticks_per_beat=480)
    track = mido.MidiTrack()
    midi.tracks.append(track)
    track.append(mido.MetaMessage("set_tempo", tempo=500_000, time=0))
    track.append(mido.Message("note_on", channel=0, note=60, velocity=80, time=0))
    track.append(mido.Message("note_off", channel=0, note=60, velocity=0, time=480))
    track.append(mido.MetaMessage("end_of_track", time=0))
    midi.save(midi_path)

    result = subprocess.run(
        [sys.executable, str(SCRIPT), str(midi_path)],
        capture_output=True,
        check=False,
        text=True,
    )

    assert result.returncode == 0, result.stderr
    assert "id\tnotes\tspan_s\tpitch_range" in result.stdout
    assert "take\t1\t0.500\tC4-C4\t80.00\t0.00\t0\t0" in result.stdout


def test_cli_generates_piano_roll_and_velocity_figures(tmp_path: Path) -> None:
    midi_path = tmp_path / "take.mid"
    midi = mido.MidiFile(type=0, ticks_per_beat=480)
    track = mido.MidiTrack()
    midi.tracks.append(track)
    track.append(mido.MetaMessage("set_tempo", tempo=500_000, time=0))
    track.append(mido.Message("note_on", channel=0, note=60, velocity=80, time=0))
    track.append(mido.Message("note_off", channel=0, note=60, velocity=0, time=480))
    track.append(mido.MetaMessage("end_of_track", time=0))
    midi.save(midi_path)
    figures_directory = tmp_path / "figures"

    result = subprocess.run(
        [
            sys.executable,
            str(SCRIPT),
            str(midi_path),
            "--figures-dir",
            str(figures_directory),
        ],
        capture_output=True,
        check=False,
        text=True,
    )

    assert result.returncode == 0, result.stderr
    assert (figures_directory / "piano-rolls.png").stat().st_size > 1_000
    assert (figures_directory / "velocity-distributions.png").stat().st_size > 1_000
