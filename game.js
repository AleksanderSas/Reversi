"use strict";

const HumanPlayer = 1;
const ComputerPlayer = 2;
const AvailableMove = 3;

var Game = null;
function CreateBoardAndInitGame(){
    let boardSize = document.getElementById("bord_size_text").value;
    let minMaxLevel = document.getElementById("aiLevel").selectedIndex + 2;
    
    CreateBoard(boardSize);

    Game = new BoardState(
        boardSize, 
        SetCellStyle, 
        mes => document.getElementById("info").innerHTML = mes, 
        minMaxLevel);

    Game.Restart();
    Game.ComputeAvailableAndMark();

    document.getElementById("player1_score").innerHTML = 2;
    document.getElementById("player2_score").innerHTML = 2;
} 

function CreateBoard(boardSize){
    let board = document.getElementById("game_board");
    var html = [];
    html.push('<table border="1" class="board"');
    for(let y = 0; y < boardSize; y++){
        html.push("<tr>");
        for(let x = 0; x < boardSize; x++){
            html.push(
            '<td id="' + x + "_" + y + '"',
            ' onclick="ClickCell(' + x + "," + y + ',this)"',
            ' onmouseover="Prompt(' + x + "," + y + ',true)"',
            ' onmouseout="Prompt(' + x + "," + y + ',false)">',
            "</td>"
            );
        }
        html.push("</tr>");
    }
    html.push("</table>");
    board.innerHTML = html.join("");
}

function Prompt(x, y, isMouseEntering){
    let cells = Game.ReverseMap.get(x + "_" + y);
    if(cells != undefined){
        cells.forEach(c => {
            let cell = document.getElementById(c.x + "_" + c.y).classList;
            if(isMouseEntering){
                cell.add('prompt');
            }else{
                cell.remove('prompt');
            }
        })
    }
}

function SetCellStyle(y, x, state)
{
    let cell = document.getElementById(x + "_" + y);
    switch(state){
        case 0:
        cell.className = "";
        break;
        case HumanPlayer:
        cell.className = "circle_blue";
        break;
        case ComputerPlayer:
        cell.className = "circle_red";
        break;
        case AvailableMove:
        cell.className = "available";
        break;
    }
}

function ClickCell(x, y, cell){
   let cellState = Game.State[y][x];
   if(cellState != AvailableMove){
       return;
   }
   cell.className = "circle_blue";

   Game.Move(x, y, HumanPlayer, ComputerPlayer);
   Game.UnMarkLastAvailableHumanMoves();
   let scores = null;
   do{
        scores = Game.PerformNextTurnAntGetResult();
        document.getElementById("player1_score").innerHTML = scores.Player1;
        document.getElementById("player2_score").innerHTML = scores.Player2;

        if(Game.LastAvailableHumanMoves.size == 0 && !scores.IfFinished){
            alert("Tracisz ruch!");
        }

        if(scores.IfFinished){
            let msg = null;
            if(scores.Player1 > scores.Player2){
                msg = "Koniec gry. Wygrales!";
            }else if(scores.Player1 == scores.Player2){
                msg = "Koniec gry. Remis!";
            }else{
                msg = "Koniec gry. Przegrales!";
            }
            alert(msg)
        }
    
   }while(Game.LastAvailableHumanMoves.size == 0 && !scores.IfFinished);
   

}

function BoardState(boardSize, setBoardCell, setInfo, minMaxLevel){

    this.BoardSize = boardSize;
    this.SetBoardCell = setBoardCell;
    this.SetInfo = setInfo;
    this.MinMaxLevel = minMaxLevel;
    this.LastComputerMove = null;

    let stateTmp = [];
    for(let y = 0; y < boardSize; y++){
        stateTmp.push(new Array(Number.parseInt(boardSize)));
    }
    this.State = stateTmp;

    this.Restart = function(){
        let middle = Math.floor(this.BoardSize / 2) - 1;
        this.State[middle][middle] = 2;
        this.SetBoardCell(middle, middle, 2);

        this.State[middle][middle + 1] = 1;
        this.SetBoardCell(middle, middle + 1, 1);

        this.State[middle + 1][middle] = 1;
        this.SetBoardCell(middle + 1, middle, 1);

        this.State[middle + 1][middle + 1] = 2;
        this.SetBoardCell(middle + 1, middle + 1, 2);

        //Test 1
        /*this.State[middle][1] = 2;
        this.SetBoardCell(middle, 1, 2);

        this.State[middle][2] = 1;
        this.SetBoardCell(middle, 2, 1);

        this.State[middle+1][2] = 2;
        this.SetBoardCell(middle+1, 2, 2); */

        //Test 2
        /* this.State[2][0] = 1;
        this.SetBoardCell(2, 0, 1);

        this.State[2][1] = 1;
        this.SetBoardCell(2, 1, 1);

        this.State[3][2] = 2;
        this.SetBoardCell(3, 2, 2);

        this.State[5][1] = 1;
        this.SetBoardCell(5, 1, 1);

        this.State[1][2] = 2;
        this.SetBoardCell(1, 2, 2);

        this.State[2][3] = 1;
        this.SetBoardCell(2, 3, 1);

        // this.State[4][1] = 1;
        // this.SetBoardCell(4, 1, 1);

        this.State[middle+1][2] = 2;
        this.SetBoardCell(middle+1, 2, 2); */
    }

    this.LastAvailableHumanMoves = null;

    this.ComputeAvailableAndMark = function()
    {
        this.LastAvailableHumanMoves = this.GetAvailable(HumanPlayer, ComputerPlayer);
        this.LastAvailableHumanMoves.forEach(move => {
            this.State[move.y][move.x]= AvailableMove;
            this.SetBoardCell(move.y, move.x, AvailableMove);
        });
        this.ComputeReverseToMoveMapping();
    }

    this.UnMarkLastAvailableHumanMoves = function(){
        this.LastAvailableHumanMoves.forEach(move => {
            if(this.State[move.y][move.x] == AvailableMove){
                this.State[move.y][move.x]= null;
                this.SetBoardCell(move.y, move.x, 0);
            }
        });
    }

    this.GetAvailable = function(player, enemy)
    {
        let positions = new Map();
        let boardSize = this.BoardSize;
        for(let y = 0; y < boardSize; y++){
            for(let x = 0; x < boardSize; x++){
                if(this.State[y][x] == player){
                    this.GetAvailableOnDirection(x, y - 1, 0, -1, enemy, positions);
                    this.GetAvailableOnDirection(x, y + 1, 0, 1, enemy, positions);
                    this.GetAvailableOnDirection(x - 1, y, -1, 0, enemy, positions);
                    this.GetAvailableOnDirection(x + 1, y, 1, 0, enemy, positions);

                    this.GetAvailableOnDirection(x - 1, y - 1, -1, -1, enemy, positions);
                    this.GetAvailableOnDirection(x + 1, y + 1, 1, 1, enemy, positions);
                    this.GetAvailableOnDirection(x - 1, y + 1, -1, 1, enemy, positions);
                    this.GetAvailableOnDirection(x + 1, y - 1, 1, -1, enemy, positions);
                }
            }
        }
        return positions;
    }
    
    this.GetAvailableOnDirection = function(startX, startY, dirX, dirY, enemy, positions){
        let ack = false;
        let size = this.BoardSize;
        while(startY >= 0 && startX >= 0 && startX < size && startY < size && this.State[startY][startX] === enemy){
            startY += dirY;
            startX += dirX;
            ack = true;
        }
        if(ack && startY >= 0 && startX >= 0 && startX < size && startY < size && this.State[startY][startX] == null){
            positions.set(startX + "_" + startY, {x: startX, y: startY});
        }
    }

    this.Score = function(player1, player2){
        let player1score = 0;
        let player2score = 0;

        for(let y = 0; y < this.BoardSize; y++){
            for(let x = 0; x < this.BoardSize; x++){
                let cell = this.State[y][x];
                let onVLine = x == 0 || x == this.BoardSize - 1;
                let onHLine = y == 0 || y == this.BoardSize - 1;
                if(cell == player1){
                    if(onHLine || onVLine){
                            player1score += 10;
                    }
                    if(onHLine && onVLine){
                        player1score += 45;
                    }
                    player1score++;
                }else if(cell == player2){
                    if(onHLine || onVLine){
                        player2score += 10;
                    }
                    if(onHLine && onVLine){
                        player2score += 45;
                    }
                    player2score++;
                }
            }
        }
        return {Player1 : player1score, Player2: player2score};
    }

    this.CurentResult = function(player1, player2){
        let player1score = 0;
        let player2score = 0;

        for(let y = 0; y < this.BoardSize; y++){
            for(let x = 0; x < this.BoardSize; x++){
                let cell = this.State[y][x];
                if(cell == player1){
                    player1score++;
                }else if(cell == player2){
                    player2score++;
                }
            }
        }

        let computerCannotMove = this.GetAvailable(ComputerPlayer, HumanPlayer).size == 0;
        let isFinished = computerCannotMove && this.LastAvailableHumanMoves.size == 0;
        return {Player1 : player1score, Player2: player2score, IfFinished: isFinished};
    }

    this.PerformNextTurnAntGetResult = function(){
        this.PerformComputerMove();
        this.ComputeAvailableAndMark();
        return this.CurentResult(HumanPlayer, ComputerPlayer);
    }

    this.PerformComputerMove = function(){
        this.MinMaxAlfa = Number.MAX_VALUE;
        let bestScore = this.MinMaxIter(2, 1, this.MinMaxLevel, null);
        if(bestScore.Move != null){
            if(this.setInfo != null){
                this.SetInfo(bestScore.Score)
            }
            this.Move(bestScore.Move.x, bestScore.Move.y, 2, 1);
            this.LastComputerMove = bestScore.Move;
        }else{
            if(this.setInfo != null){
                this.SetInfo("Komputer traci ruch.")
            }
            this.LastComputerMove = null;
        }
    }

    this.MinMaxAlfa = Number.MAX_VALUE;
    //returns (score, move) of the best move
    this.MinMaxIter= function(player1, player2, iterNo, parentIteration){
        if(iterNo <= 0){
            let score =this.Score(player1, player2);
            return {Score: score.Player1 - score.Player2, Move: null};
        }
        let available = this.GetAvailable(player1, player2);
        if(available.size == 0){
            //TODO: is it correct???
            let tmp =this.MinMaxIter(player2,player1, iterNo - 1, null);
            tmp.Score = -tmp.Score;
            return tmp;
        }
        let bestScore = Number.MAX_VALUE;
        let bestMove = null;
        let availableMoveIterator = available.values();//[Symbol.iterator]();
        let Itr = availableMoveIterator.next();

        while(!Itr.done){
            let avai = Itr.value;
            let copy = this.Copy();
            copy.Move(avai.x,avai.y, player1, player2, null);
            let newScore = copy.MinMaxIter(player2, player1, iterNo - 1, this);
            //ALFA-BETA prunning
            if(parentIteration != null && parentIteration.MinMaxAlfa < -newScore.Score){
                return {Score: -newScore.Scor, Move: avai};
            }
            if(newScore.Score < bestScore){
                bestScore = newScore.Score;
                this.MinMaxAlfa = bestScore;
                bestMove = avai;
            }
            Itr = availableMoveIterator.next();
        }
        return {Score: -bestScore, Move: bestMove};
    }

    this.Copy = function(){
        let copy = new BoardState(this.BoardSize, null, null, 0);
        for(let y = 0; y < this.BoardSize; y++){
            for(let x = 0; x < this.BoardSize; x++){
                let cell = this.State[y][x];
                if(cell != 3){
                    copy.State[y][x] = cell;
                }
            }
        }
        return copy;
    }

    this.Move = function(x, y, player, enemy){
        this.PerformOnMoveAction(x, y, player, enemy, this.MoveAction.bind(this));
    } 

    this.PerformOnMoveAction = function(x, y, player, enemy, action){
        action(x, y, player);
        this.MoveBase(x + 1, y, player,enemy, 1, 0, action);
        this.MoveBase(x + 1, y + 1, player,enemy, 1, 1, action);
        this.MoveBase(x + 1, y - 1, player,enemy, 1, -1, action);

        this.MoveBase(x - 1, y, player,enemy, -1, 0, action);
        this.MoveBase(x - 1, y + 1, player,enemy, -1, 1, action);
        this.MoveBase(x - 1, y - 1, player,enemy, -1, -1, action);

        this.MoveBase(x, y + 1, player,enemy, 0, 1, action);
        this.MoveBase(x, y - 1, player,enemy, 0, -1, action);
    }

    this.MoveBase = function(x, y, player, enemy, dirX, dirY, action){
        let xTmp = x;
        let yTmp = y;
        while(x >= 0 && x < this.BoardSize && y >= 0 && y < this.BoardSize && this.State[y][x] == enemy)
        {
            x += dirX;
            y += dirY;
        }

        if(x >= 0 && x < this.BoardSize && y >= 0 && y < this.BoardSize 
            && this.State[y][x] == player){
            x = xTmp;
            y = yTmp;
            while(x >= 0 && x < this.BoardSize && y >= 0 && y < this.BoardSize && this.State[y][x] == enemy)
            {
                action(x, y, player);
                x += dirX;
                y += dirY;
            }
        }
    }

    this.MoveAction = function(x, y, player){
        this.State[y][x] = player;
        if(this.SetBoardCell != null){
            this.SetBoardCell(y, x, player);
        }
    }

    this.ReverseMap = null;

    this.ComputeReverseToMoveMapping = function(){
        this.ReverseMap = new Map();
        this.LastAvailableHumanMoves.forEach(move => {
            let collection = [];
            this.ReverseMap.set(move.x + "_" + move.y, collection)
            this.PerformOnMoveAction(move.x, move.y, 1, 2, (x, y, _) => {collection.push({x: x, y: y});})
        });
    }
}