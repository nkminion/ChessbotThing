export const ENGINE_OPTIONS = [
  { value: 'ChessNet', label: 'ChessNet' },
  { value: 'MCTS', label: 'MCTS' },
  { value: 'sunfish', label: 'Sunfish' },
]

export const TIME_PRESETS = [
  { id: 'bullet', label: '1 | 0 Bullet', seconds: 60, increment: 0 },
  { id: 'blitz', label: '3 | 2 Blitz', seconds: 180, increment: 2 },
  { id: 'rapid', label: '10 | 5 Rapid', seconds: 600, increment: 5 },
  { id: 'classical', label: '15 | 10 Classical', seconds: 900, increment: 10 },
]

export const DEFAULT_PRESET = TIME_PRESETS[2]
