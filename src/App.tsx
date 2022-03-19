import React, { useState } from 'react';
import './App.css';
import { contains, remove } from './ArrayUtilities';
import whitePawn from './chesspieces/pawn.png';
import blackPawn from './chesspieces/black_pawn.png';
import whiteRook from './chesspieces/rook.png';
import blackRook from './chesspieces/black_rook.png';
import whiteKnight from './chesspieces/knight.png';
import blackKnight from './chesspieces/black_knight.png';
import whiteBishop from './chesspieces/bishop.png';
import blackBishop from './chesspieces/black_bishop.png';
import whiteQueenImg from './chesspieces/queen.png';
import blackQueenImg from './chesspieces/black_queen.png';
import whiteKingImg from './chesspieces/king.png';
import blackKingImg from './chesspieces/black_king.png';
import { Action } from './MyEvent';

enum Color {
    WHITE = "WHITE",
    BLACK = "BLACK"
}

enum Rank {
    KING = "KING",
    QUEEN = "QUEEN",
    BISHOP = "BISHOP",
    KNIGHT = "KNIGHT",
    ROOK = "ROOK",
    WHITEPAWN = "WHITEPAWN",
    BLACKPAWN = "BLACKPAWN"
}

const isPawn = (rank: Rank) => rank === Rank.WHITEPAWN || rank === Rank.BLACKPAWN;

const pieces = Object.freeze({
    WHITE: Object.freeze({
        KING: whiteKingImg,
        QUEEN: whiteQueenImg,
        BISHOP: whiteBishop,
        KNIGHT: whiteKnight,
        ROOK: whiteRook,
        WHITEPAWN: whitePawn,
        BLACKPAWN: blackPawn
    }),
    BLACK: Object.freeze({
        KING: blackKingImg,
        QUEEN: blackQueenImg,
        BISHOP: blackBishop,
        KNIGHT: blackKnight,
        ROOK: blackRook,
        WHITEPAWN: whitePawn,
        BLACKPAWN: blackPawn
    }),
});

class Vector2 {
    x: number;
    y: number;

    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    add(delta: Vector2) {
        return new Vector2(this.x + delta.x, this.y + delta.y);
    }
}

class Tile {
    position: Vector2;
    unit: Unit | null;
    possibleUnit: Unit | null;
    promotes: Color | null;

    constructor(position: Vector2, promotes: Color | null) {
        this.position = position;
        this.unit = null;
        this.possibleUnit = null;
        this.promotes = promotes;
    }

    moveTo(unit: Unit) {
        this.unit?.taken();
        this.unit = unit;
        this.possibleUnit = unit;
        unit.tile = this;
    }

    moveFrom() {
        this.unit = null;
        this.possibleUnit = null;
    }
}

class Unit {
    color: Color;
    rank: Rank;
    tile: Tile;
    availableMoves: Tile[];
    availableAttacks: Tile[];
    lineOfSight: Tile[][];
    hasMoved: boolean;
    debugMe: boolean;
    onTaken: Action<Unit>;
    onCheck: Action<Unit>;

    constructor(color: Color, rank: Rank, tile: Tile) {
        this.color = color;
        this.rank = rank;
        this.tile = tile;
        this.availableMoves = [];
        this.availableAttacks = [];
        this.lineOfSight = [];
        this.hasMoved = false;
        tile.unit = this;
        tile.possibleUnit = this;
        units[this.color].push(this);
        this.debugMe = false;
        this.onTaken = new Action(this);
        this.onCheck = new Action(this);
    }

    taken() {
        takens[this.color].push(this);
        remove(units[this.color], this);
        this.debugMe = false;
        this.onTaken.dispatch(this);
        this.onTaken.unsubscribeAll();
        this.onCheck.unsubscribeAll();
    }

    // returns true if promotion is to occur
    move(pos: Vector2) {
        this.hasMoved = true;

        this.tile.moveFrom();
        gridV2(pos).moveTo(this);

        this.calculateLineOfSight(true);

        if (checkIfCheck(oppositeColor[this.color])) {
            this.onCheck.dispatch(this);
        }
        return false;
    }

    debugCalculation(debugCallback: () => void) {
        if (this.debugMe) {
            debugCallback();
        }
    }

    enableDebug(b: boolean) {
        this.debugMe = b;
    }

    setupPossibleUnit(tile: Tile) {
        tile.possibleUnit = this;
        this.tile.possibleUnit = null;
        if (tile.unit) remove(units[oppositeColor[this.color]], tile.unit);
    }

    cleanupPossibleUnit(tile: Tile) {
        if (tile.unit) units[oppositeColor[this.color]].push(tile.unit);
        tile.possibleUnit = tile.unit;
        this.tile.possibleUnit = this.tile.unit;
    }

    calculateMoves(calculatingUnit: boolean, save: boolean) {
        if (!calculatingUnit && save) {
            console.log("problematic arguments");
            return [];
        }

        let moves: Tile[] = [];
        const blockable = this.rank === Rank.QUEEN || this.rank === Rank.BISHOP || this.rank === Rank.ROOK || isPawn(this.rank);
        for (let set of this.lineOfSight) {
            for (let tile of set) {
                // if tile is empty or contains enemy
                if (!tile.possibleUnit || (tile.possibleUnit.color === oppositeColor[this.color] && !isPawn(this.rank))) {
                    if (calculatingUnit) {
                        // check if moves exposes king
                        this.setupPossibleUnit(tile);
                        if (!isCheck(this.color)) moves.push(tile);
                        this.cleanupPossibleUnit(tile);
                    }
                    else {
                        moves.push(tile);
                    }
                }
                if (blockable && tile.possibleUnit) {
                    break;
                }
            }
        }
        if (save) {
            this.availableMoves = moves;
        }
        return moves;
    }

    calculateAttacks(calculatingUnit: boolean, save: boolean) {
        if (!calculatingUnit && save) {
            console.log("problematic arguments");
            return [];
        }

        let attacks: Tile[] = [];
        if (isPawn(this.rank)) {
            for (let move of this.color === Color.WHITE ? movesets.WHITEPAWNATTACK[0] : movesets.BLACKPAWNATTACK[0]) {
                let tile = gridV2(this.tile.position.add(move));
                if (tile && tile.possibleUnit?.color === oppositeColor[this.color]) {
                    if (calculatingUnit) {
                        this.setupPossibleUnit(tile);
                        if (!isCheck(this.color)) attacks.push(tile);
                        this.cleanupPossibleUnit(tile);
                    }
                    else {
                        attacks.push(tile);
                    }
                }
            }
        }
        else {
            attacks = this.calculateMoves(calculatingUnit, save);
        }
        if (save) {
            this.availableAttacks = attacks;
        }
        return attacks;
    }

    clearMoves() {
        this.availableMoves = [];
        this.availableAttacks = [];
    }

    calculateLineOfSight(save: boolean) {
        let lineOfSight: Tile[][] = [];
        let moveset : Vector2[][];
        if (isPawn(this.rank) && !this.hasMoved) {
            moveset = this.color === Color.WHITE ? movesets.WHITEPAWNMOVEINITIAL : movesets.BLACKPAWNMOVEINITIAL;
        }
        else {
            moveset = movesets[this.rank];
        }
        for (let set of moveset) {
            let sightSet: Tile[] = [];
            for (let move of set) {
                let possiblePos = this.tile.position.add(move);
                if (isTile(possiblePos)) {
                    sightSet.push(gridV2(possiblePos));
                }
            }
            lineOfSight.push(sightSet);
        }
        if (save) {
            this.lineOfSight = lineOfSight;
        }
        return lineOfSight;
    }
}

class King extends Unit {
    possibleTile: Tile;
    availableCastles: Tile[];

    constructor(color: Color, rank: Rank, tile: Tile) {
        super(color, rank, tile);
        this.possibleTile = tile;
        this.availableCastles = [];
    }

    override move(pos: Vector2) {
        this.possibleTile = gridV2(pos);
        return super.move(pos);
    }

    override setupPossibleUnit(tile: Tile) {
        super.setupPossibleUnit(tile);
        this.possibleTile = tile;
    }

    override cleanupPossibleUnit(tile: Tile) {
        this.possibleTile = this.tile;
        super.cleanupPossibleUnit(tile);
    }

    override calculateMoves(calculatingUnit: boolean, save: boolean) {
        let moves = super.calculateMoves(calculatingUnit, save);
        if (calculatingUnit) {
            for (let rook of rooks[this.color]) {
                if (!contains(takens[this.color], rook) && rook.canCastle()) {
                    moves.push(grid(this.tile.position.x + 2 * rook.castleDirection, this.tile.position.y));
                    this.availableCastles.push(grid(this.tile.position.x + 2 * rook.castleDirection, this.tile.position.y));
                }
            }
        }
        return moves;
    }

    override clearMoves() {
        super.clearMoves();
        this.availableCastles = [];
    }

    castle(tile: Tile) {
        const originalPos = this.tile.position;
        this.move(tile.position);
        if (tile.position.x < originalPos.x) {
            // castle to the left
            rooks[this.color][0].move(new Vector2(tile.position.x + 1, tile.position.y));
        }
        else {
            // castle to the right
            rooks[this.color][1].move(new Vector2(tile.position.x - 1, tile.position.y));
        }
    }
}

class Rook extends Unit {
    castleDirection: number;

    constructor(color: Color, rank: Rank, tile: Tile, castleDirection: number) {
        super(color, rank, tile);
        this.castleDirection = castleDirection;
    }

    canCastle() {
        if (!kings[this.color].hasMoved && !this.hasMoved) {
            if (isCheck(this.color)) {
                return false;
            }
            const dir = this.castleDirection;
            const kingPos = kings[this.color].tile.position;
            const startPos = kingPos.x * dir;
            for (let i = startPos + 1; i < startPos + 3; i++) {
                if (grid(i * dir, kingPos.y).unit || isTileAttacked(grid(i * dir, kingPos.y), this.color)) {
                    return false;
                }
            }
            if (dir < 0 && grid(kingPos.x - 3, kingPos.y).unit) {
                return false;
            }
            return true;
        }
        return false;
    }
}

class Pawn extends Unit {
    override move(pos: Vector2) {
        super.move(pos);
        if (isPawn(this.rank) && gridV2(pos).promotes === this.color) {
            return true;
        }
        return false;
    }

    promote(rank: Rank) {
        this.rank = rank;
        this.calculateLineOfSight(true);
        if (checkIfCheck(oppositeColor[this.color])) {
            this.onCheck.dispatch(this);
        }
    }
}

const shapes = Object.freeze({
    plus: [new Vector2(0, 1), new Vector2(-1, 0), new Vector2(1, 0), new Vector2(0, -1)],
    cross: [new Vector2(-1, 1), new Vector2(1, 1), new Vector2(-1, -1), new Vector2(1, -1)]
});

function createMoveset(baseSet: Vector2[], start: number, end: number) {
    let moveset: Vector2[][] = [];
    for (let move of baseSet) {
        let set = [];
        for (let i = start; i <= end; i++) {
            set.push(new Vector2(move.x * i, move.y * i));
        }
        moveset.push(set);
    }

    return moveset;
}

const movesets: IMovesetMap = Object.freeze({
    KING: [[...shapes.plus, ...shapes.cross]],
    QUEEN: createMoveset([...shapes.plus, ...shapes.cross], 1, 7),
    BISHOP: createMoveset(shapes.cross, 1, 7),
    KNIGHT: [[new Vector2(-1, 2), new Vector2(1, 2), new Vector2(-2, 1), new Vector2(2, 1), new Vector2(-2, -1), new Vector2(2, -1), new Vector2(-1, -2), new Vector2(1, -2)]],
    ROOK: createMoveset(shapes.plus, 1, 7),
    WHITEPAWNMOVEINITIAL: [[new Vector2(0, 1), new Vector2(0, 2)]],
    BLACKPAWNMOVEINITIAL: [[new Vector2(0, -1), new Vector2(0, -2)]],
    WHITEPAWN: [[new Vector2(0, 1)]],
    BLACKPAWN: [[new Vector2(0, -1)]],
    WHITEPAWNATTACK: [[new Vector2(-1, 1), new Vector2(1, 1)]],
    BLACKPAWNATTACK: [[new Vector2(-1, -1), new Vector2(1, -1)]]
})

interface IUnitArrayMap {
    [key: string]: Unit[];
}
//interface IUnitMap {
//    [key: string]: Unit;
//}
interface IKingMap {
    [key: string]: King;
}
interface IMovesetMap {
    [key: string]: Vector2[][];
}

const tiles: Tile[] = [];
for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
        let promotes = null;
        if (j === 0) promotes = Color.BLACK;
        else if (j === 7) promotes = Color.WHITE;
        tiles.push(new Tile(new Vector2(i,j), promotes));
    }
}

const grid = (i: number, j: number) => tiles[i * 8 + j];
const gridV2 = (pos: Vector2) => grid(pos.x, pos.y);
const isTile = (pos: Vector2) => pos.x < 0 || pos.x > 7 || pos.y < 0 || pos.y > 7 ? false : true;

const whiteTakens: Unit[] = [];
const blackTakens: Unit[] = [];
const takens: IUnitArrayMap = Object.freeze({ WHITE: whiteTakens, BLACK: blackTakens });

const whiteUnits: Unit[] = [];
const blackUnits: Unit[] = [];
const units: IUnitArrayMap = Object.freeze({ WHITE: whiteUnits, BLACK: blackUnits });

const oppositeColor = Object.freeze({ WHITE: Color.BLACK, BLACK: Color.WHITE });
let turn = Color.WHITE;

const whiteKing = new King(Color.WHITE, Rank.KING, grid(4, 0));
const blackKing = new King(Color.BLACK, Rank.KING, grid(4, 7));
const kings: IKingMap = Object.freeze({ WHITE: whiteKing, BLACK: blackKing });

const pawns: IPawnMap = { WHITE: [], BLACK: [] };

for (let i = 0; i < 8; i++) {
    let unit: Pawn;
    unit = new Pawn(Color.WHITE, Rank.WHITEPAWN, grid(i, 1));
    pawns[Color.WHITE].push(unit);
    unit = new Pawn(Color.BLACK, Rank.BLACKPAWN, grid(i, 6));
    pawns[Color.BLACK].push(unit);
}

const whiteRook1 = new Rook(Color.WHITE, Rank.ROOK, grid(0, 0), -1);
new Unit(Color.WHITE, Rank.KNIGHT, grid(1, 0));
new Unit(Color.WHITE, Rank.BISHOP, grid(2, 0));
new Unit(Color.WHITE, Rank.QUEEN, grid(3, 0));
new Unit(Color.WHITE, Rank.BISHOP, grid(5, 0));
new Unit(Color.WHITE, Rank.KNIGHT, grid(6, 0));
const whiteRook2 = new Rook(Color.WHITE, Rank.ROOK, grid(7, 0), 1);

const blackRook1 = new Rook(Color.BLACK, Rank.ROOK, grid(0, 7), -1);
new Unit(Color.BLACK, Rank.KNIGHT, grid(1, 7));
new Unit(Color.BLACK, Rank.BISHOP, grid(2, 7));
new Unit(Color.BLACK, Rank.QUEEN, grid(3, 7));
new Unit(Color.BLACK, Rank.BISHOP, grid(5, 7));
new Unit(Color.BLACK, Rank.KNIGHT, grid(6, 7));
const blackRook2 = new Rook(Color.BLACK, Rank.ROOK, grid(7, 7), 1);

interface IRookMap {
    [key:string]: Rook[]
}

interface IPawnMap {
    [key: string]: Pawn[]
}

const rooks: IRookMap = { WHITE: [whiteRook1, whiteRook2], BLACK: [blackRook1, blackRook2] };

whiteUnits.forEach(unit => unit.calculateLineOfSight(true));
blackUnits.forEach(unit => unit.calculateLineOfSight(true));

const allUnits = [...whiteUnits, ...blackUnits];

function isTileAttacked(tile: Tile, color: Color) {
    for (let unit of units[oppositeColor[color]]) {
        if (contains(unit.calculateAttacks(false, false), tile)) {
            return true;
        }
    }
    return false;
}

function isCheck(color: Color){
    for (let unit of units[oppositeColor[color]]) {
        if (unitChecks(unit)) {
            return true;
        }
    }
    return false;
}

let check: Color | null = null;
let checkedBy: Unit[] = [];

function checkIfCheck(color: Color) {
    let checked = false;
    for (let unit of units[oppositeColor[color]]) {
        if (unitChecks(unit)) {
            console.log("CHECK: " + color + " is checked");
            check = color;
            checkedBy.push(unit);
            checked = true;
        }
    }
    return checked;
}

function unitChecks(unit: Unit) {
    return contains(unit.calculateAttacks(false, false), kings[oppositeColor[unit.color]].possibleTile);
}

function checkmate(color: Color) {
    console.log("CHECKMATE: " + oppositeColor[color] + " wins");
}

function stalemate() {
    console.log("STALEMATE: draw");
}

interface ITileProps {
    position: Vector2;
    currentUnit: Unit | null;
    selectUnit(tile: Tile | null): void;
}

interface IGridProps {
    currentUnit: Unit | null;
    selectUnit(tile: Tile | null): void;
}

const tileColor = (tile: Tile, currentUnit: Unit | null) => {
    if (currentUnit && contains(currentUnit.availableAttacks, tile) && tile.unit?.color === oppositeColor[currentUnit.color]) {
        return "red";
    }
    else if (currentUnit && contains(currentUnit.availableMoves, tile)) {
        return "yellow";
    }
    else if (currentUnit && currentUnit.tile === tile) {
        return "orange";
    }
    else if (check === turn && tile.unit === kings[turn]) {
        return "pink";
    }
    else if (contains(checkedBy, tile.unit)) {
        return "purple";
    }
    else if (tile.position.x % 2 === tile.position.y % 2) {
        return "green";
    }
    else {
        return "blue";
    }
}

function TileDisplay(props: ITileProps) {
    const [tile] = useState(gridV2(props.position));

    let unitDisplay: JSX.Element | null;

    if (tile.unit) {
        unitDisplay = <img className="Piece" src={pieces[tile.unit.color][tile.unit.rank]} alt="" />;
    }
    else {
        unitDisplay = null;
    }

    return (
        <div className="GridTile" onClick={() => props.selectUnit(tile)} style={{ backgroundColor: tileColor(tile, props.currentUnit) }}>
            {unitDisplay}
        </div>
    );
}

function GridDisplay(props: IGridProps) {
    const gridTiles: JSX.Element[] = [];
    for (let i = 0; i < 8; i++) {
        for (let j = 7; j >= 0; j--) {
            const tile = grid(i, j);
            gridTiles.push(<TileDisplay position={tile.position} currentUnit={props.currentUnit} selectUnit={props.selectUnit} key={`${i},${j}`} />);
        }
    }
    return (
        <div className="Grid">{gridTiles}</div>
    );
}

function TakenDisplay(props: { units: Unit[], reverseDisplay: boolean }) {
    let className = "TakenBoard";
    className += props.reverseDisplay ? " ReverseTakenBoard" : "";
    //const className = props.reverseDisplay ? "ReverseTakenBoard" : "TakenBoard";
    const takenUnits = props.units.map((unit, i) => <img className="TakenPiece" src={pieces[unit.color][unit.rank]} alt="" key={`${unit.rank} ${i}`} />);
    return (
        <div className={className}>{takenUnits}</div>
    );
}

function TurnText(props: { color: Color }) {
    let className = "TurnText" + (props.color === turn ? " HighlightTurn" : "");
    return (
        <div className={className}>
            {props.color}
        </div>
    );
}

function PromotionContainer(props: { promote: (rank: Rank) => void }) {
    return (
        <div id="PromotionContainer">
            <div className="Promoter" onClick={() => props.promote(Rank.KNIGHT)}>Knight</div>
            <div className="Promoter" onClick={() => props.promote(Rank.ROOK)}>Rook</div>
            <div className="Promoter" onClick={() => props.promote(Rank.BISHOP)}>Bishop</div>
            <div className="Promoter" onClick={() => props.promote(Rank.QUEEN)}>Queen</div>
        </div>
    );
}

function GameLog(props: { logs: string[] }) {
    const logMessages = props.logs.map((msg, i) => <p className="LogMessage" key={"log" + i}>{msg}</p>);
    return (
        <div id="GameLog">
            {logMessages}
        </div>
    );
}

interface IAppProps {

}

interface IAppState {
    currentUnit: Unit | null;
    promotion: boolean;
    logs: string[];
    checkmated: boolean;
    subscribedLogs: boolean;
}

interface ITileLetters {
    [key: number]: string;
}
const tileLetters: ITileLetters = { 0: "a", 1: "b", 2: "c", 3: "d", 4: "e", 5: "f", 6: "g", 7: "h",}

const tileName = (pos: Vector2) => tileLetters[pos.x] + (pos.y + 1);

const logRank = (rank: Rank) => {
    if (isPawn(rank)) {
        return "Pawn";
    }
    else {
        return rank.substr(0, 1) + rank.slice(1).toLowerCase();
    }
}

class App extends React.Component<IAppProps, IAppState> {
    constructor(props: IAppProps) {
        super(props);
        this.state = {
            currentUnit: null as Unit | null,
            promotion: false,
            logs: [],
            checkmated: false,
            subscribedLogs: false
        }
        this.selectUnit = this.selectUnit.bind(this);
        this.setUnit = this.setUnit.bind(this);
        this.deselectCurrentUnit = this.deselectCurrentUnit.bind(this);
        this.nextTurn = this.nextTurn.bind(this);
        this.promote = this.promote.bind(this);
        this.log = this.log.bind(this);
        this.logUnitTakenMessage = this.logUnitTakenMessage.bind(this);
        this.logUnitChecksMessage = this.logUnitChecksMessage.bind(this);
    }

    logUnitTakenMessage(unit: Unit) {
        const currentUnit = this.state.currentUnit;
        if (currentUnit)
            this.log(`${currentUnit.color} ${logRank(currentUnit.rank)} takes ${unit.color}  ${logRank(unit.rank)}`)
    }

    logUnitChecksMessage(unit: Unit) {
        this.log(`${unit.color} ${logRank(unit.rank)} checks ${oppositeColor[unit.color]}`)
    }

    componentDidMount() {
        allUnits.forEach(unit => {
            unit.onTaken.subscribeOnce(this.logUnitTakenMessage);
            unit.onCheck.subscribe(this.logUnitChecksMessage);
        });
        
    }
    
    componentWillUnmount() {
        allUnits.forEach(unit => {
            unit.onTaken.unsubscribeOnce(this.logUnitTakenMessage);
            unit.onCheck.unsubscribe(this.logUnitChecksMessage);
        });
    }

    selectUnit(tile: Tile) {
        if (this.state.checkmated) return;
        if (this.state.promotion) return;
        if (this.state.currentUnit) {
            if (contains(this.state.currentUnit.availableMoves, tile) || contains(this.state.currentUnit.availableAttacks, tile)) {
                check = null;
                checkedBy = [];
                const currentUnit = this.state.currentUnit;
                let promotion = false;
                if (currentUnit === kings[currentUnit.color] && contains(kings[currentUnit.color].availableCastles, tile)) {
                    // castle
                    this.log(`${currentUnit.color} ${logRank(currentUnit.rank)} castle ${tileName(currentUnit.tile.position)} to ${tileName(tile.position)}`);
                    kings[currentUnit.color].castle(tile);
                }
                else {
                    this.log(`${currentUnit.color} ${logRank(currentUnit.rank)} move ${tileName(currentUnit.tile.position)} to ${tileName(tile.position)}`);
                    promotion = currentUnit.move(tile.position);
                }
                if (promotion) {
                    this.state.currentUnit?.clearMoves();
                    this.setState(prevState => ({ ...prevState, promotion: true }))
                }
                else {
                    this.deselectCurrentUnit();
                    this.nextTurn();
                }
            }
            else if (tile.unit?.color === turn && tile.unit !== this.state.currentUnit) {
                // select another unit
                this.deselectCurrentUnit();
                this.selectNewUnit(tile.unit);
            }
            else {
                // deselect current unit
                this.deselectCurrentUnit();
            }
        }
        else if (tile.unit?.color === turn) {
            // select unit on this tile
            this.selectNewUnit(tile.unit);
        }
    }

    setUnit(unit: Unit | null) {
        this.setState(prevState => ({ ...prevState, currentUnit: unit }));
    }

    selectNewUnit(unit: Unit) {
        this.setUnit(unit);
        unit.calculateMoves(true, true);
        unit.calculateAttacks(true, true);
    }

    deselectCurrentUnit() {
        this.state.currentUnit?.clearMoves();
        this.setUnit(null);
    }

    nextTurn() {
        turn = oppositeColor[turn];
        if (units[turn].every(unit => unit.calculateMoves(true, false).length === 0)) {
            if (isCheck(turn)) {
                this.log(`${oppositeColor[turn]} checkmates ${turn}`);
                this.setState(prevState => ({ ...prevState, checkmated: true }));
                checkmate(turn);
            }
            else {
                this.log(`stalemate: draw`);
                this.setState(prevState => ({ ...prevState, checkmated: true }));
                stalemate();
            }
        }
    }

    promote(rank: Rank) {
        const currentUnit = this.state.currentUnit as Unit;
        (currentUnit as Pawn).promote(rank);
        this.setState(prevState => ({ ...prevState, promotion: false }));
        this.log(`${currentUnit.color} Pawn promotes to ${logRank(currentUnit.rank)}`);
        this.deselectCurrentUnit();
        this.nextTurn();
    }

    log(message: string) {
        this.setState(prevState => ({ ...prevState, logs: [...prevState.logs, message] }));
    }

    render() {
        const turnTextContainer = (<div id="TurnTextContainer">
            <TurnText color={Color.BLACK} />
            <TurnText color={Color.WHITE} />
        </div>)
        const promotionContainer = (<PromotionContainer promote={this.promote} />)

        return (
            <div id="ChessContainer">
                <div id="Chess">
                    {turnTextContainer}
                    <div id="GameContainer">
                        {this.state.promotion && this.state.currentUnit?.color === Color.WHITE ? promotionContainer : <TakenDisplay units={takens[Color.WHITE]} reverseDisplay={true} />}
                        <GridDisplay currentUnit={this.state.currentUnit} selectUnit={this.selectUnit} />
                        {this.state.promotion && this.state.currentUnit?.color === Color.BLACK ? promotionContainer : <TakenDisplay units={takens[Color.BLACK]} reverseDisplay={false} />}
                    </div>
                    <GameLog logs={this.state.logs} />
                </div>
            </div>
        );
    }
}

export default App;