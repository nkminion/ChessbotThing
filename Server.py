from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from ChessBot import GetBestMove
import sunfish
import sunfish_uci
import time

sunfish_uci.sunfish = sunfish

App = FastAPI()

App.add_middleware(
	CORSMiddleware,
	allow_origins=['http://localhost:5173'], # I should fix this later :C
	allow_credentials=True,
	allow_methods=['POST'],
	allow_headers=['*'],
)

class MoveReq(BaseModel):
	FenString: str
	TimeRem: float
	Increment: float
	Mode: str

@App.post('/engine/move')
def CalculateMove(request: MoveReq):
	match request.Mode:
		case 'ChessNet':
			EngineMove = GetBestMove(request.FenString,request.TimeRem,request.Increment)
		case 'sunfish':
			FenParts = request.FenString.split()
			CurrentPos = sunfish_uci.from_fen(*FenParts)
			Hist = [CurrentPos]

			MaxTime = (request.TimeRem/40.0) + request.Increment
			AbsoluteMax = (request.TimeRem * 0.8) - 0.1
			FinalTime = min(MaxTime,AbsoluteMax)

			StartTime = time.time()
			Searcher = sunfish.Searcher()
			EngineMove = None
			
			for depth,gamma,score,move in Searcher.search(Hist):
				ElapsedTime = time.time() - StartTime
				if ElapsedTime > FinalTime:
					break
				EngineMove = move
				
			IsWhiteTurn = (sunfish_uci.get_color(CurrentPos) == sunfish_uci.WHITE)
			EngineMove = sunfish_uci.render_move(EngineMove,IsWhiteTurn)
	return {'BestMove':EngineMove}