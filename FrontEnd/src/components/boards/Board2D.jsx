import { Chessboard } from 'react-chessboard'

export function Board2D({ state, actions, squareStyles }) {
  const chessboardOptions = {
    id: 'chessbots-board',
    allowDragging: !state.isEngineThinking && !state.pendingPromotion && state.phase !== 'end',
    animationDurationInMs: 220,
    boardOrientation: state.orientation,
    boardStyle: {
      width: '100%',
      maxWidth: '600px',
      margin: '0 auto',
      borderRadius: '18px',
      boxShadow: '0 18px 48px rgba(28, 34, 41, 0.14)',
      border: '10px solid #745b3c',
      overflow: 'hidden',
    },
    darkSquareStyle: { backgroundColor: '#9f7a4d' },
    lightSquareStyle: { backgroundColor: '#f1e3c7' },
    squareStyles,
    position: state.positionFen,
    onPieceDrop: ({ sourceSquare, targetSquare }) =>
      actions.handlePieceDrop(sourceSquare, targetSquare),
    onSquareClick: ({ square }) => actions.handleSquareSelection(square),
  }

  return (
    <div className="board2d-shell">
      <div className="board2d-shell__header">
        <span className="eyebrow">Live Board</span>
        <strong>{state.orientation === 'white' ? 'White at bottom' : 'Black at bottom'}</strong>
      </div>
      <Chessboard options={chessboardOptions} />
    </div>
  )
}
