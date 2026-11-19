import { MetronomeBlock, MetronomeSettings } from './metronome-settings';

/** Looks up each step's block, skipping steps whose block was deleted. */
export function resolveSteps(blockIds: readonly string[], blocks: readonly MetronomeBlock[]): MetronomeBlock[] {
  const byId = new Map(blocks.map((b) => [b.id, b]));
  return blockIds.map((id) => byId.get(id)).filter((b): b is MetronomeBlock => !!b);
}

/** Whether a block plays until skipped (no bar count). */
export function isUntimed(block: MetronomeBlock): boolean {
  return block.settings.bars <= 0;
}

/** How long a block lasts, in seconds (bars × beats per bar at its tempo). */
export function blockSeconds(settings: MetronomeSettings): number {
  return (settings.bars * settings.beatsPerBar * 60) / settings.bpm;
}

/** Total bars of a sequence, or null when a block has no bar count. */
export function totalBars(blocks: readonly MetronomeBlock[]): number | null {
  if (blocks.some(isUntimed)) return null;
  return blocks.reduce((sum, b) => sum + b.settings.bars, 0);
}

/** e.g. "0:45", "12:05", "1:02:30". */
export function formatDuration(seconds: number): string {
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = (s % 60).toString().padStart(2, '0');
  return h ? `${h}:${m.toString().padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

/** e.g. "24 bars · ≈ 1:30", or "no fixed length". */
export function formatTotal(blocks: readonly MetronomeBlock[]): string {
  const bars = totalBars(blocks);
  if (bars === null) return 'no fixed length';
  const seconds = blocks.reduce((sum, b) => sum + blockSeconds(b.settings), 0);
  return `${bars} ${bars === 1 ? 'bar' : 'bars'} · ≈ ${formatDuration(seconds)}`;
}

/** e.g. "3 blocks · 24 bars · ≈ 1:30". */
export function describeSequence(blocks: readonly MetronomeBlock[]): string {
  return `${blocks.length} ${blocks.length === 1 ? 'block' : 'blocks'} · ${formatTotal(blocks)}`;
}
