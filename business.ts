const colorMaxVal = 255;
const cellSize = 4; // pixels

const maxStrength = 4.5;
const maxMoveDistance = 5;

const respirationCost = 0.3;
const birthCost = 0.8;
const moveCost = 0.5;
const predateCost = 0.3;

const photosynthesisReturn = respirationCost;
const photosynthesisReturnMaxExtra = 0.2; // Up to this much randomly added to photosynthesisReturn
const predatePercentReturn = 0.8; // You get this percent of the cell you eat
const predatePercentReturnMaxExtra = 0.2; // Up to this much is added to predatePercentReturn

const higherStrengthPredateFaillureProb = 0.15;
const equalStrengthPredateSuccessProb = 0.5;
const lowerStrengthPredateSucessProb = 0.2;

var oneHundredPercentMortalityAge = 1e30; // milleseconds

class Simulation {
    constructor(private layers: Layer<any>[], private ctx: CanvasRenderingContext2D) {
    }

    step() {
        let previousLayer: Layer<any> | null = null;

        for (let layer of this.layers) {
            layer.update(previousLayer);
            previousLayer = layer;
        }
    }

    draw() {
        for (let layer of this.layers) {
            layer.draw(this.ctx);
        }
    }
}

abstract class Cell {
    public abstract color: Color;
    public abstract strength: number;

    private timeCreated: number;

    constructor() {
        this.timeCreated = new Date().getTime();
    }

    public abstract update(holdingLayer: Layer<any>, belowLayer: Layer<any> | null, x: number, y: number): CellAction;
    public getDeathProbability(): number {
        let age = ((new Date()).getTime() - this.timeCreated);
        return Math.pow(age / oneHundredPercentMortalityAge, (-3 * Math.max(age - 1, 0)) + (3 * age));
    }

    // Returns true if the Cell can perform that action without dying
    public modifyStrength(delta: number): boolean {
        let newStrength = this.strength + delta;
        if (newStrength <= 0) return false;

        this.strength = Math.min(newStrength, maxStrength);
        return true;
    }

    public getFightingStrength(): number {
        return this.strength;
    }
}

class BirthAction<T extends Cell> {
    public readonly kind = "birth";

    constructor(public cell: T, public x: number, public y: number) {
    }
}

class DeathAction {
    public readonly kind = "death";
}

class PredateAction {
    public readonly kind = "predate";

    constructor(public x: number, public y: number) {
    }
}

class PhotosynthesizeAction {
    public readonly kind = "photosynthesize";
}

class MoveAction {
    public readonly kind = "move";

    constructor(public x: number, public y: number) {
    }
}

class DoNothingAction {
    public readonly kind = "nothing";
}

// Because all types in this union have "kind" members, this becomes
// TypeScript's weird version of an algebraic data type
type CellAction =
    BirthAction<any> | DeathAction | PredateAction |
    PhotosynthesizeAction | MoveAction | DoNothingAction;

enum ColorBase {
    Red,
    Green,
    Blue,
    Other,
}

class Color {
    public r: number = 0;
    public g: number = 0;
    public b: number = 0;

    constructor(public base: ColorBase, color?: { r: number, g: number, b: number }) {
        if (color) {
            this.r = color.r;
            this.g = color.g;
            this.b = color.b;
        } else
            this.changeComponentForBase(() => colorMaxVal);
    }

    distance(other: Color): number {
        if (other.base != this.base) return 1;
        let dist = 0;
        this.changeComponentForBase((compVal, otherCompVal) => {
            dist = Math.abs(compVal - (otherCompVal || 0)) / colorMaxVal;
            return compVal;
        }, other);
        return dist;
    }

    randomPerturb(maxPerturb: number): void {
        this.changeComponentForBase(
            (compVal) => compVal + randomRange(-maxPerturb, maxPerturb)
        );
    }

    cssColor(): string {
        return `rgb(${this.r}, ${this.g}, ${this.b})`;
    }

    // XXX: This method is a little hard to understand, even if it makes things way more concise
    private changeComponentForBase(func: (componentVal: number, otherComponentVal?: number) => number, other?: Color): void {
        switch (this.base) {
            case ColorBase.Red:
                this.r = func(this.r, (other !== undefined) ? other.r : undefined);
                break;
            case ColorBase.Green:
                this.g = func(this.r, (other !== undefined) ? other.r : undefined);
                break;
            case ColorBase.Blue:
                this.b = func(this.r, (other !== undefined) ? other.r : undefined);
                break;
            default:
                throw new Error("Cannot apply operation to ColorBase " + this.base);
        }
    }
}

class Layer<T extends Cell> {
    private cells: (T | null)[][];

    constructor(width: number, height: number) {
        this.cells = new Array<T[] | null>(Math.trunc(height / cellSize)).fill(null).map(
            () => Array<T | null>(Math.trunc(width / cellSize)).fill(null)
        );
    }

    update(belowLayer: Layer<any> | null) {
        this.cells.forEach((row, y) => row.forEach((cell, x) => {
            if (!cell) return;

            cell.modifyStrength(-respirationCost);

            let action = cell.update(this, belowLayer, x, y);

            if (Math.random() < cell.getDeathProbability()) {
                action = new DeathAction();
            }

            switch (action.kind) {
                case "nothing":
                    return;
                case "birth":
                    let canBirth = cell.modifyStrength(-birthCost);
                    if (!canBirth) return;

                    this.setCell(action.cell, action.x, action.y);
                    return;
                case "death":
                    this.clearCell(x, y);
                    return;
                case "predate":
                    let canPredate = cell.modifyStrength(-predateCost);
                    if (!canPredate) return;

                    let prey = this.getCell(action.x, action.y);
                    if (prey === null) return;

                    if (
                        (prey.getFightingStrength() < cell.getFightingStrength() && Math.random() > higherStrengthPredateFaillureProb) ||
                        (prey.getFightingStrength() === cell.getFightingStrength() && Math.random() < equalStrengthPredateSuccessProb) ||
                        (prey.getFightingStrength() > cell.getFightingStrength() && Math.random() < lowerStrengthPredateSucessProb)
                    ) {
                        cell.modifyStrength(prey.strength * (predatePercentReturn + randomRange(-predatePercentReturnMaxExtra, predatePercentReturnMaxExtra)));
                        this.moveCell(x, y, action.x, action.y);
                    }
                    return;
                case "photosynthesize":
                    cell.modifyStrength(photosynthesisReturn + Math.random() * photosynthesisReturnMaxExtra)
                    return;
                case "move":
                    let canMove = cell.modifyStrength(-moveCost);
                    if (!canMove) return;

                    if (this.getCell(action.x, action.y) === null) return;

                    this.moveCell(x, y, action.x, action.y);
                    return;
                default:
                    return this.assertNever(action);
            }
        }));
    }

    draw(ctx: CanvasRenderingContext2D) {
        this.cells.forEach((row, rowNum) => row.forEach((cell, colNum) => {
            if (!cell) return;
            ctx.fillStyle = cell.color.cssColor();
            ctx.fillRect(rowNum * cellSize, colNum * cellSize, cellSize, cellSize);
        }));
    }

    setCell(cell: T, x: number, y: number) {
        this.cells[y][x] = cell;
    }

    getCell(x: number, y: number): T | null {
        return this.cells[y][x];
    }

    clearCell(x: number, y: number) {
        this.cells[y][x] = null;
    }

    moveCell(fromX: number, fromY: number, toX: number, toY: number) {
        if (distance(fromX, fromY, toX, toY) > maxMoveDistance)
            return;

        let cell = this.getCell(fromX, fromY);
        if (cell === null) return;

        this.setCell(cell, toX, toY);
        this.clearCell(fromX, fromY);
    }

    map(fn: (x: number, y: number, currentOccupant: T | null) => T | null) {
        this.cells = this.cells.map((arr, y) => arr.map((currentVal, x) => {
            return fn(x, y, currentVal);
        }));
    }

    forEachInRadius(centerX: number, centerY: number, radius: number, fn: (x: number, y: number, currentOccupant: T | null) => void) {
        for (let y = Math.max(centerY - radius, 0); y <= centerY + radius && y < this.cells.length; y++) {
            for (let x = Math.max(centerX - radius, 0); x <= centerX + radius && x < this.cells[y].length; x++) {
                fn(x, y, this.getCell(x, y));
            }
        }
    }

    private assertNever(x: never): never {
        throw new Error("Unexpected type: " + x);
    }
}

class Vector {
    constructor(public x: number, public y: number) {
    }

    public getMagnitude(): number {
        return Math.hypot(this.x, this.y);
    }

    public setMagnitude(magnitude: number): Vector {
        this.normalize();
        this.multiply(magnitude);
        return this;
    }

    public getDirection(): number {
        return Math.atan2(this.y, this.x);
    }

    public setDirection(angleRads: number): Vector {
        let magnitude = this.getMagnitude();
        this.x = Math.cos(angleRads) * magnitude;
        this.y = Math.sin(angleRads) * magnitude;
        return this;
    }

    public normalize(): Vector {
        let magnitude = this.getMagnitude();
        this.divide(magnitude);
        return this;
    }

    public dot(other: Vector): number {
        return this.x * other.x + this.y * other.y;
    }

    public inverse(): Vector {
        this.multiply(-1);
        return this;
    }

    public add(addend: number | Vector): Vector {
        if (addend instanceof Vector) {
            this.x += addend.x;
            this.y += addend.y;
        } else {
            this.x += addend;
            this.y += addend;
        }
        return this;
    }

    public multiply(multiplicand: number | Vector): Vector {
        if (multiplicand instanceof Vector) {
            this.x += multiplicand.x;
            this.y += multiplicand.y;
        } else {
            this.x *= multiplicand;
            this.y *= multiplicand;
        }
        return this;
    }

    public divide(dividend: number | Vector): Vector {
        if (dividend instanceof Vector) {
            this.x += dividend.x;
            this.y += dividend.y;
        } else {
            this.x /= dividend;
            this.y /= dividend;
        }
        return this;
    }

    public truncate(): Vector {
        this.x = Math.trunc(this.x);
        this.y = Math.trunc(this.y);
        return this;
    }

    public round(): Vector {
        this.x = Math.round(this.x);
        this.y = Math.round(this.y);
        return this;
    }

    public distance(other: Vector): number {
        return Math.hypot(other.x - this.x, other.y - this.y);
    }

    public copy(): Vector {
        return new Vector(this.x, this.y);
    }

    public toString(): string {
        return "<" + this.x + ", " + this.y + ">";
    }

    public toArray(): number[] {
        return [this.x, this.y];
    }

    public toObject() {
        return {x: this.x, y: this.y};
    }
}

function distance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.hypot(x2 - x1, y2 - y1);
}

function randomRange(min: number, max: number): number {
    return Math.random() * (max - min) + min;
}