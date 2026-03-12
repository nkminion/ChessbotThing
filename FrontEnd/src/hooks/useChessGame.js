import { useEffect, useReducer, useRef } from 'react'
import { Chess } from 'chess.js'
import { DEFAULT_PRESET } from '../lib/gameConstants.js'
import {
  buildSquareStyles,
  downloadPgn,
  getCheckSquare,
  getResultMessage,
  isBotMode,
} from '../lib/chessUi.js'

const INITIAL_PLAYERS = {
  white: { name: '', mode: 'human', engine: 'ChessNet' },
  black: { name: '', mode: 'human', engine: 'MCTS' },
}

function createInitialState() {
  const fen = new Chess().fen()
  return {
    phase: 'setup',
    players: INITIAL_PLAYERS,
    timePreset: DEFAULT_PRESET,
    orientation: 'white',
    positionFen: fen,
    previousFen: fen,
    lastMove: null,
    moveHistory: [],
    selectedSquare: '',
    legalTargets: [],
    pendingPromotion: null,
    whiteTime: DEFAULT_PRESET.seconds,
    blackTime: DEFAULT_PRESET.seconds,
    isEngineThinking: false,
    engineStatus: '',
    engineError: '',
    resultMessage: '',
  }
}

function reducer(state, action) {
  switch (action.type) {
    case 'UPDATE_SETUP':
      return {
        ...state,
        players: {
          ...state.players,
          [action.side]: {
            ...state.players[action.side],
            ...action.patch,
          },
        },
      }
    case 'SET_PRESET':
      return {
        ...state,
        timePreset: action.preset,
        whiteTime: action.preset.seconds,
        blackTime: action.preset.seconds,
      }
    case 'START_GAME':
      return {
        ...state,
        phase: 'playing',
        positionFen: action.fen,
        previousFen: action.fen,
        lastMove: null,
        moveHistory: [],
        selectedSquare: '',
        legalTargets: [],
        pendingPromotion: null,
        whiteTime: state.timePreset.seconds,
        blackTime: state.timePreset.seconds,
        isEngineThinking: false,
        engineStatus: '',
        engineError: '',
        resultMessage: '',
      }
    case 'SELECT_SQUARE':
      return {
        ...state,
        selectedSquare: action.square,
        legalTargets: action.moves,
      }
    case 'CLEAR_SELECTION':
      return {
        ...state,
        selectedSquare: '',
        legalTargets: [],
      }
    case 'PENDING_PROMOTION':
      return {
        ...state,
        phase: 'promotion',
        pendingPromotion: action.move,
      }
    case 'CANCEL_PROMOTION':
      return {
        ...state,
        phase: 'playing',
        pendingPromotion: null,
        selectedSquare: '',
        legalTargets: [],
      }
    case 'SET_ENGINE_STATUS':
      return {
        ...state,
        engineStatus: action.status,
      }
    case 'ENGINE_REQUEST_START':
      return {
        ...state,
        isEngineThinking: true,
        engineStatus: action.status,
        engineError: '',
      }
    case 'ENGINE_REQUEST_FAILURE':
      return {
        ...state,
        isEngineThinking: false,
        engineStatus: '',
        engineError: action.message,
      }
    case 'MOVE_COMMITTED':
      return {
        ...state,
        phase: action.phase,
        previousFen: action.previousFen,
        positionFen: action.nextFen,
        lastMove: action.lastMove,
        moveHistory: action.moveHistory,
        selectedSquare: '',
        legalTargets: [],
        pendingPromotion: null,
        whiteTime: action.whiteTime,
        blackTime: action.blackTime,
        isEngineThinking: false,
        engineStatus: action.engineStatus,
        engineError: '',
        resultMessage: action.resultMessage,
      }
    case 'CLOCK_TICK':
      return action.side === 'white'
        ? { ...state, whiteTime: Math.max(0, state.whiteTime - 1) }
        : { ...state, blackTime: Math.max(0, state.blackTime - 1) }
    case 'END_GAME':
      return {
        ...state,
        phase: 'end',
        isEngineThinking: false,
        engineStatus: '',
        resultMessage: action.message,
      }
    case 'TOGGLE_ORIENTATION':
      return {
        ...state,
        orientation: state.orientation === 'white' ? 'black' : 'white',
      }
    case 'PLAY_AGAIN':
      return {
        ...state,
        phase: 'playing',
        positionFen: action.fen,
        previousFen: action.fen,
        lastMove: null,
        moveHistory: [],
        selectedSquare: '',
        legalTargets: [],
        pendingPromotion: null,
        whiteTime: state.timePreset.seconds,
        blackTime: state.timePreset.seconds,
        isEngineThinking: false,
        engineStatus: '',
        engineError: '',
        resultMessage: '',
      }
    case 'RETURN_TO_SETUP':
      return {
        ...state,
        phase: 'setup',
        positionFen: action.fen,
        previousFen: action.fen,
        lastMove: null,
        moveHistory: [],
        selectedSquare: '',
        legalTargets: [],
        pendingPromotion: null,
        whiteTime: state.timePreset.seconds,
        blackTime: state.timePreset.seconds,
        isEngineThinking: false,
        engineStatus: '',
        engineError: '',
        resultMessage: '',
      }
    default:
      return state
  }
}

export function useChessGame() {
  const chessRef = useRef(new Chess())
  const requestIdRef = useRef(0)
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState)
  const board = chessRef.current
  const players = state.players

  const finishGameIfNeeded = (boardInstance, timeoutMessage = null) => {
    if (!boardInstance.isGameOver() && !timeoutMessage) {
      return null
    }
    return getResultMessage(boardInstance, players, timeoutMessage)
  }

  const startGame = () => {
    requestIdRef.current += 1
    chessRef.current = new Chess()
    dispatch({ type: 'START_GAME', fen: chessRef.current.fen() })
  }

  const restartGame = () => {
    requestIdRef.current += 1
    chessRef.current = new Chess()
    dispatch({ type: 'PLAY_AGAIN', fen: chessRef.current.fen() })
  }

  const returnToSetup = () => {
    requestIdRef.current += 1
    chessRef.current = new Chess()
    dispatch({ type: 'RETURN_TO_SETUP', fen: chessRef.current.fen() })
  }

  const updateSetup = (side, patch) => {
    dispatch({ type: 'UPDATE_SETUP', side, patch })
  }

  const setTimePreset = (preset) => {
    dispatch({ type: 'SET_PRESET', preset })
  }

  const toggleOrientation = () => dispatch({ type: 'TOGGLE_ORIENTATION' })
  const clearSelection = () => dispatch({ type: 'CLEAR_SELECTION' })

  const exportPgn = () => {
    downloadPgn({
      board,
      whiteName: players.white.name,
      blackName: players.black.name,
      result: state.resultMessage || 'Game',
    })
  }

  const commitMove = (move, source) => {
    const previousFen = board.fen()
    const result = board.move(move)
    const nextFen = board.fen()
    const whiteMoved = board.turn() === 'b'
    const increment = state.timePreset.increment
    const whiteTime = whiteMoved ? state.whiteTime + increment : state.whiteTime
    const blackTime = whiteMoved ? state.blackTime : state.blackTime + increment
    const moveHistory = board.history({ verbose: true })
    const resultMessage = finishGameIfNeeded(board)
    const phase = resultMessage ? 'end' : 'playing'

    dispatch({
      type: 'MOVE_COMMITTED',
      phase,
      previousFen,
      nextFen,
      lastMove: { from: result.from, to: result.to },
      moveHistory,
      whiteTime,
      blackTime,
      engineStatus: '',
      resultMessage: resultMessage ?? '',
    })

    if (resultMessage) {
      dispatch({ type: 'END_GAME', message: resultMessage })
    }
  }

  const getMovesFromSquare = (square) =>
    board.moves({
      square,
      verbose: true,
    })

  const canHumanInteract = () => {
    if (state.phase === 'setup' || state.phase === 'end' || state.isEngineThinking || state.pendingPromotion) {
      return false
    }

    const currentSide = board.turn() === 'w' ? 'white' : 'black'
    return !isBotMode(players[currentSide].mode)
  }

  const tryHumanMove = (fromSquare, toSquare) => {
    if (!canHumanInteract()) {
      return false
    }

    const move = getMovesFromSquare(fromSquare).find((candidate) => candidate.to === toSquare)
    if (!move) {
      return false
    }

    const movingPiece = board.get(fromSquare)
    if (movingPiece?.type === 'p' && (toSquare.endsWith('1') || toSquare.endsWith('8'))) {
      dispatch({
        type: 'PENDING_PROMOTION',
        move: { from: fromSquare, to: toSquare },
      })
      return true
    }

    commitMove({ from: fromSquare, to: toSquare }, 'human')
    return true
  }

  const handleSquareSelection = (square) => {
    if (state.phase === 'setup' || state.phase === 'end' || state.isEngineThinking) {
      return
    }

    if (state.pendingPromotion) {
      return
    }

    const currentSide = board.turn() === 'w' ? 'white' : 'black'
    if (isBotMode(players[currentSide].mode)) {
      return
    }

    if (!state.selectedSquare) {
      const piece = board.get(square)
      if (!piece || piece.color !== board.turn()) {
        return
      }
      const moves = getMovesFromSquare(square)
      if (!moves.length) {
        return
      }
      dispatch({ type: 'SELECT_SQUARE', square, moves })
      return
    }

    if (state.selectedSquare === square) {
      clearSelection()
      return
    }

    const move = state.legalTargets.find((candidate) => candidate.to === square)
    if (!move) {
      const piece = board.get(square)
      if (piece && piece.color === board.turn()) {
        dispatch({ type: 'SELECT_SQUARE', square, moves: getMovesFromSquare(square) })
      } else {
        clearSelection()
      }
      return
    }

    tryHumanMove(state.selectedSquare, square)
  }

  const handlePieceDrop = (sourceSquare, targetSquare) => {
    const success = tryHumanMove(sourceSquare, targetSquare)
    if (!success) {
      clearSelection()
    }
    return success
  }

  const handlePromotion = (piece) => {
    if (!state.pendingPromotion) {
      return
    }

    if (!piece) {
      dispatch({ type: 'CANCEL_PROMOTION' })
      return
    }

    commitMove(
      {
        from: state.pendingPromotion.from,
        to: state.pendingPromotion.to,
        promotion: piece,
      },
      'human',
    )
  }

  useEffect(() => {
    if (!['playing', 'promotion'].includes(state.phase) || state.resultMessage) {
      return
    }

    const timer = setInterval(() => {
      const side = board.turn() === 'w' ? 'white' : 'black'
      dispatch({ type: 'CLOCK_TICK', side })
    }, 1000)

    return () => clearInterval(timer)
  }, [board, state.phase, state.positionFen, state.resultMessage])

  useEffect(() => {
    if (!['playing', 'promotion'].includes(state.phase)) {
      return
    }

    if (state.whiteTime > 0 && state.blackTime > 0) {
      return
    }

    const timeoutSide = state.whiteTime <= 0 ? 'white' : 'black'
    const winnerSide = timeoutSide === 'white' ? 'black' : 'white'
    const timeoutMessage = board.isInsufficientMaterial()
      ? `Draw: ${players[timeoutSide].name} flagged and ${players[winnerSide].name} has insufficient material.`
      : `${players[winnerSide].name} wins on time.`

    requestIdRef.current += 1
    dispatch({ type: 'END_GAME', message: timeoutMessage })
  }, [board, players, state.blackTime, state.phase, state.whiteTime])

  useEffect(() => {
    if (state.phase !== 'playing' || state.isEngineThinking || state.resultMessage) {
      return
    }

    const currentSide = board.turn() === 'w' ? 'white' : 'black'
    const player = players[currentSide]
    if (!isBotMode(player.mode)) {
      dispatch({ type: 'SET_ENGINE_STATUS', status: '' })
      return
    }

    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    dispatch({
      type: 'ENGINE_REQUEST_START',
      status: `${player.name || player.engine} is thinking...`,
    })

    const currentTime = currentSide === 'white' ? state.whiteTime : state.blackTime

    const fetchMove = async () => {
      try {
        const response = await fetch('http://localhost:8000/engine/move', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            FenString: board.fen(),
            TimeRem: currentTime,
            Increment: state.timePreset.increment,
            Mode: player.engine,
          }),
        })

        if (!response.ok) {
          throw new Error(`Engine request failed with status ${response.status}`)
        }

        const data = await response.json()
        const engineMove = data.BestMove
        if (!engineMove || engineMove === '0000' || engineMove === '(none)') {
          throw new Error(`Engine returned invalid move: ${engineMove}`)
        }

        if (requestIdRef.current !== requestId) {
          return
        }

        commitMove(
          {
            from: engineMove.slice(0, 2),
            to: engineMove.slice(2, 4),
            promotion: engineMove[4] || undefined,
          },
          'engine',
        )
      } catch (error) {
        if (requestIdRef.current !== requestId) {
          return
        }

        dispatch({
          type: 'ENGINE_REQUEST_FAILURE',
          message: error.message || 'Engine bridge collapsed.',
        })
      }
    }

    fetchMove()
  }, [
    board,
    players,
    state.blackTime,
    state.isEngineThinking,
    state.phase,
    state.positionFen,
    state.resultMessage,
    state.timePreset.increment,
    state.whiteTime,
  ])

  const canStart =
    players.white.name.trim().length > 0 && players.black.name.trim().length > 0

  return {
    state,
    derived: {
      canStart,
      squareStyles: buildSquareStyles({
        lastMove: state.lastMove,
        selectedSquare: state.selectedSquare,
        legalTargets: state.legalTargets,
        checkSquare: getCheckSquare(state.positionFen),
      }),
    },
    actions: {
      clearSelection,
      exportPgn,
      handlePieceDrop,
      handlePromotion,
      handleSquareSelection,
      restartGame,
      returnToSetup,
      setTimePreset,
      startGame,
      toggleOrientation,
      updateSetup,
    },
  }
}
