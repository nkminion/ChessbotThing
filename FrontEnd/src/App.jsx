import { useState,useRef, useEffect } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard';
import './App.css'



function App() {
  const ChessGameRef = useRef(new Chess());
  const ChessGame = ChessGameRef.current;

  const [AppPhase, SetAppPhase] = useState('setup');

  const [Player1Name, SetPlayer1Name] = useState('');
  const [Player1Mode, SetPlayer1Mode] = useState('human');
  const [Player2Name, SetPlayer2Name] = useState('');
  const [Player2Mode, SetPlayer2Mode] = useState('human');

  const [ChessPosition,SetChessPosition] = useState(ChessGame.fen());
  const [MoveFrom,SetMoveFrom] = useState('');
  const [OptionSquares,SetOptionSquares] = useState({});
  const [PromotionSquare, SetPromotionSquare] = useState(null);
  const [PendingMove, SetPendingMove] = useState(null);
  const [LastMove, SetLastMove] = useState(null);
  const [WhiteTime, SetWhiteTime] = useState(600);
  const [BlackTime, SetBlackTime] = useState(600);
  const [TimeoutStatus, SetTimeOutStatus] = useState(null);
  const Increment = 5;

  useEffect(() => {
    if (ChessGame.isGameOver() || TimeoutStatus || AppPhase === 'setup')
    {
      return;
    }
    const Timer = setInterval(() => {
      if (ChessGame.turn() == 'w')
      {
        SetWhiteTime((prev) => prev-1);
      }
      else
      {
        SetBlackTime((prev) => prev-1);
      }
    },1000);
    return () => clearInterval(Timer);
  }, [ChessPosition,AppPhase,TimeoutStatus]);

  useEffect(() => {
    if (ChessGame.isGameOver())
    {
      if (ChessGame.isCheckmate())
      {
        const Winner = ChessGame.turn() === 'w' ? Player2Name : Player1Name;
        SetTimeOutStatus(`Checkmate! ${Winner} won!`);
      }
      else if (ChessGame.isDraw())
      {
        SetTimeOutStatus('Draw!');
      }
      SetAppPhase('end');
    }
  }, [ChessPosition]);

  useEffect(() => {
    if (WhiteTime <= 0)
    {
      if (ChessGame.isInsufficientMaterial())
      {
        SetTimeOutStatus('Draw: White timed out, Black has insufficient material.');
      }
      else
      {
        SetTimeOutStatus('Black wins on time!');
      }
      SetAppPhase('end');
    }
    if (BlackTime <= 0)
    {
      if (ChessGame.isInsufficientMaterial())
      {
        SetTimeOutStatus('Draw: Black timed out, White has insufficient material.');
      }
      else
      {
        SetTimeOutStatus('White wins on time!');
      }
      SetAppPhase('end');
    }
  }, [WhiteTime,BlackTime]);

  useEffect(() => {
    const CurrentTurn = ChessGame.turn()
    const CurrentMode = CurrentTurn === 'w' ? Player1Mode : Player2Mode
    if (ChessGame.isGameOver() || CurrentMode === 'human' || AppPhase === 'setup')
    {
      return;
    }
    if (TimeoutStatus)
    {
      return;
    }
    const FetchBotMove = async () => {
      try
      {
        const TimeRemaining = CurrentTurn === 'w' ? WhiteTime : BlackTime;
        const PayLoad = {
          FenString: ChessGame.fen(),
          TimeRem: TimeRemaining,
          Increment: Increment,
          Mode: CurrentMode
        };
        const response = await fetch('http://localhost:8000/engine/move', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(PayLoad)
        });
        if (!response.ok)
        {
          throw new Error(`Engine request failed with status ${response.status}`);
        }

        const data = await response.json();
        const EngineMove = data.BestMove;
        if (!EngineMove || EngineMove === '0000' || EngineMove === '(none)')
        {
          throw new Error(`Engine returned invalid move: ${EngineMove}`);
        }
        console.log('Fetched!');
        ChessGame.move({
          from: EngineMove.slice(0,2),
          to: EngineMove.slice(2,4),
          promotion: EngineMove[4] ? EngineMove[4] : undefined
        });
        if (CurrentTurn === 'w')
        {
          SetWhiteTime((prev) => prev+Increment);
        }
        else
        {
          SetBlackTime((prev) => prev+Increment);
        }
        SetLastMove({
          from: EngineMove.slice(0,2),
          to: EngineMove.slice(2,4)
        })
        SetChessPosition(ChessGame.fen());
      }
      catch (error)
      {
        console.error('Engine bridge collapsed: ',error);
      }
    };
    FetchBotMove();
  },[ChessPosition,AppPhase]);


  function OnPromotionPieceSelect(piece)
  {
    try
    {
      if (!piece)
      {
        SetPendingMove(null);
        SetPromotionSquare(null);
        SetMoveFrom('');
        return false;
      }
      ChessGame.move({
        from: PendingMove['from'],
        to: PendingMove['to'],
        promotion: piece
      });
      SetLastMove({
        from: PendingMove['from'],
        to: PendingMove['to'],
      });
      if (ChessGame.turn() === 'b')
      {
        SetWhiteTime((prev) => prev+Increment);
      }
      else
      {
        SetBlackTime((prev) => prev+Increment);
      }
      SetChessPosition(ChessGame.fen());
      SetPromotionSquare(null);
      SetPendingMove(null);
      SetMoveFrom('');
      SetOptionSquares({});
      return true;
    }
    catch
    {
      console.log('Error!');
    }
  }


  function GetMoveOptions(square)
  {
    const moves = ChessGame.moves({
      square: square,
      verbose: true
    });
    
    if (moves.length == 0)
    {
      SetOptionSquares({});
      return false;
    }

    const NewSquares = {};

    for (const move of moves)
    {
      NewSquares[move.to] = {
        background: ChessGame.get(move.to) && ChessGame.get(move.to)?.color !== ChessGame.get(square)?.color ? 'radial-gradient(circle, rgba(0,0,0,0.1) 85%, transparent 85%)' : 'radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)',
        borderRadius: '50%',
      };
    }

    NewSquares[square] = {
      background: 'rgba(0,131,255,0.9)'
    };

    SetOptionSquares(NewSquares);

    return true;
  }


  function OnSquareClick({square})
  {
    if (TimeoutStatus)
    {
      return;
    }
    if (PromotionSquare)
    {
      return;
    }
    const IsWhiteTurn = ChessGame.turn() === 'w';
    const CurrentOccupant = IsWhiteTurn ? Player1Mode : Player2Mode;
    if (CurrentOccupant !== 'human')
    {
      return;
    }
    if (!MoveFrom)
    {
      const ClickedPiece = ChessGame.get(square);
      if (!ClickedPiece || ClickedPiece.color !== ChessGame.turn())
      {
        return;
      }
      const HasMoveOptions = GetMoveOptions(square);
      if (HasMoveOptions)
      {
        SetMoveFrom(square);
      }
      return;
    }
    const moves = ChessGame.moves({
      square: MoveFrom,
      verbose: true
    });
    const FoundMove = moves.find(m => m.from === MoveFrom && m.to === square);

    if (!FoundMove)
    {
      const HasMoveOptions = GetMoveOptions(square);
      SetMoveFrom(HasMoveOptions ? square : '');
      return;
    }
    try
    {
      const piece = ChessGame.get(MoveFrom)
      if (piece && piece.type === 'p' && (square[1] === '1' || square[1] === '8'))
      {
        SetPendingMove({
          from: MoveFrom,
          to: square
        });
        SetPromotionSquare(square);
        return;
      }
      ChessGame.move({
        from: MoveFrom,
        to: square,
      });
      if (ChessGame.turn() === 'b')
      {
        SetWhiteTime((prev) => prev+Increment);
      }
      else
      {
        SetBlackTime((prev) => prev+Increment);
      }
      SetLastMove({
        from: MoveFrom,
        to: square,
      })
    }
    catch
    {
      const HasMoveOptions = GetMoveOptions(square);
      if (HasMoveOptions)
      {
        SetMoveFrom(square);
      }
      return;
    }
    SetChessPosition(ChessGame.fen());
    SetMoveFrom('');
    SetOptionSquares({});
  }

  function FormatTime(Seconds)
  {
    const mins = Math.floor(Seconds/60);
    const secs = String(Seconds%60).padStart(2,'0');
    return `${mins}:${secs}`;
  };

  function DownloadPGN()
  {
    const PGNData = ChessGame.pgn({
      newline: '\n',
      headers: {
        White: Player1Name,
        Black: Player2Name,
        Date: new Date().toISOString().split('T')['0'],
        Result: TimeoutStatus ? 'Timeout/Draw' : 'Standard'
      }
    });

    const blob = new Blob([PGNData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${Player1Name}vs${Player2Name}.pgn`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function ResetGame()
  {
    ChessGame.reset();
    SetChessPosition(ChessGame.fen());
    SetWhiteTime(600);
    SetBlackTime(600);
    SetTimeOutStatus(null);
    SetLastMove(null);
    SetMoveFrom('');
    SetOptionSquares({});
    SetPendingMove(null);
    SetPromotionSquare(null);
    SetAppPhase('setup');
  }

  const CombinedSquares = {};
  if (LastMove)
  {
    CombinedSquares[LastMove.from] = {background: 'rgba(93,0,255,0.3)'}
    CombinedSquares[LastMove.to] = {background: 'rgba(93,0,255,0.3)'}
  }
  Object.assign(CombinedSquares,OptionSquares)


  const ChessBoardOptions = {
    boardStyle: {
      width: '75%',
      height: '75%',
      position: 'relative'
    },
    darkSquareStyle: {
      backgroundColor: '#5A5A5A'
    },
    darkSquareNotationStyle: {
      color: '#CDCDCD'
    },
    lightSquareStyle: {
      backgroundColor: '#CDCDCD'
    },
    lightSquareNotationStyle: {
      color: '#5A5A5A'
    },
    allowDragging: false,
    onSquareClick: OnSquareClick,
    position: ChessPosition,
    squareStyles: CombinedSquares,
  };


  if (AppPhase === 'setup')
  {
    return (
      <>
        <div className='matchmaking'>
          <h1>
            ChessBots
          </h1>
          <div className='players'>
            <div className='player'>
              <input
                type='text'
                placeholder='Enter player 1 name: '
                onChange={(e) => SetPlayer1Name(e.target.value)}
              />
              <select onChange={(e) => SetPlayer1Mode(e.target.value)}>
                <option value='human'>Human</option>
                <option value='ChessNet'>ChessNet</option>
                <option value='MCTS'>MCTS</option>
                <option value='sunfish'>Sunfish</option>
              </select>
            </div>
            <div className='player'>
              <input
                type='text'
                placeholder='Enter player 2 name: '
                onChange={(e) => SetPlayer2Name(e.target.value)}
              />
              <select onChange={(e) => SetPlayer2Mode(e.target.value)}>
                <option value='human'>Human</option>
                <option value='ChessNet'>ChessNet</option>
                <option value='MCTS'>MCTS</option>
                <option value='sunfish'>Sunfish</option>
              </select>
            </div>
          </div>
          <button onClick={() => {
            if (Player1Name !== '' && Player2Name !== '')
            {
              SetAppPhase('playing')
            }
          }}>Start</button>
        </div>
      </>
    );
  }
  else if (AppPhase === 'playing')
  {
    return (
      <>
      <div className='Bar'>
        <p>{Player2Name}</p>
        <div className='Time'>
          {FormatTime(BlackTime)}
        </div>
      </div>
      <div>
        <Chessboard options={ChessBoardOptions}/>
        {
          PendingMove && (
            <div style={{
              position: 'absolute',
              top: '37%',
              left: '74%',
              transform: 'translate(-50%,-50%)',
              background: 'rgba(0,0,0,0.9)',
              padding: '20px',
              zIndex: 100,
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}>
              <button onClick={() => OnPromotionPieceSelect('q')}>Queen</button>
              <button onClick={() => OnPromotionPieceSelect('r')}>Rook</button>
              <button onClick={() => OnPromotionPieceSelect('n')}>Knight</button>
              <button onClick={() => OnPromotionPieceSelect('b')}>Bishop</button>
              <button onClick={() => OnPromotionPieceSelect(null)}>Cancel</button>
            </div>
          )
        }
      </div>
      <div className='Bar'>
        <p>{Player1Name}</p>
        <div className='Time'>
          {FormatTime(WhiteTime)}
        </div>
      </div>
      </>
    );
  }
  return (
    <>
      <div className='endscreen'>
        <h1>
            ChessBots
        </h1>
        <p>
          {TimeoutStatus}
        </p>
        <div>
          <button onClick={() => ResetGame()}>Return</button>
          <button onClick={() => DownloadPGN()}>Save</button>
        </div>
      </div>
    </>
  );
}

export default App
