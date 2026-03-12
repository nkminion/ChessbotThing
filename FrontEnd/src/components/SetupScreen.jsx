import { DEFAULT_PRESET, ENGINE_OPTIONS, TIME_PRESETS } from '../lib/gameConstants.js'

function PlayerConfigurator({ side, player, onChange }) {
  return (
    <div className="setup-card">
      <div className="setup-card__header">
        <span className={`side-chip side-chip--${side}`}>{side}</span>
        <h2>{side === 'white' ? '' : ''}</h2>
      </div>
      <label className="field">
        <span>Name</span>
        <input
          value={player.name}
          placeholder={side === 'white' ? 'Aurora' : 'Obsidian'}
          onChange={(event) => onChange({ name: event.target.value })}
        />
      </label>
      <div className="field-grid">
        <label className="field">
          <span>Seat Type</span>
          <select
            value={player.mode}
            onChange={(event) => onChange({ mode: event.target.value })}
          >
            <option value="human">Human</option>
            <option value="bot">Bot</option>
          </select>
        </label>
        <label className="field">
          <span>Engine</span>
          <select
            value={player.engine}
            disabled={player.mode === 'human'}
            onChange={(event) => onChange({ engine: event.target.value })}
          >
            {ENGINE_OPTIONS.map((engine) => (
              <option key={engine.value} value={engine.value}>
                {engine.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  )
}

export function SetupScreen({ state, actions, canStart }) {
  return (
    <main className="setup-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Chess Bots</p>
          <h1>AI Chess Arena</h1>
          <p className="hero-body">
            Witness the clash of powerful AI chess engines as they battle for supremacy on the board. Step into the arena, challenge the bots yourself, and see if your strategy can outsmart artificial intelligence.
          </p>
        </div>
        <div className="preset-panel">
          <div className="preset-panel__top">
            <span className="eyebrow">Time Control</span>
            <strong>{state.timePreset?.label ?? DEFAULT_PRESET.label}</strong>
          </div>
          <div className="preset-grid">
            {TIME_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={`preset-button ${state.timePreset.id === preset.id ? 'preset-button--active' : ''}`}
                onClick={() => actions.setTimePreset(preset)}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="setup-grid">
        <PlayerConfigurator
          side="white"
          player={state.players.white}
          onChange={(patch) => actions.updateSetup('white', patch)}
        />
        <PlayerConfigurator
          side="black"
          player={state.players.black}
          onChange={(patch) => actions.updateSetup('black', patch)}
        />
      </section>

      <section className="launch-panel">
        <div className="launch-panel__summary">
          <span>All the Best</span>
          <strong>Start the Game</strong>
        </div>
        <button
          type="button"
          className="button button--hero"
          disabled={!canStart}
          onClick={actions.startGame}
        >
          Start Match
        </button>
      </section>
    </main>
  )
}
