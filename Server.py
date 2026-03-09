from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from ChessBot import GetBestMove

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

@App.post('/engine/move')
def CalculateMove(request: MoveReq):
	EngineMove = GetBestMove(request.FenString,request.TimeRem,request.Increment)
	print('Done!')
	return {'BestMove':EngineMove}