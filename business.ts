const colorMaxVal = 255;
const cellSize = 1; // pixels

class Simulation {
    constructor(private layers: Layer<any>[], ctx: CanvasRenderingContext2D) {
        let previousLayer: Layer<any> | null = null;
        for (let layer of layers) {
            layer.update(previousLayer);
            previousLayer = layer;
        }
    }
}

interface Cell {
    color: Color;

    update(belowLayer: Layer<any>): CellUpdate;
    update(): void;
}

class CellUpdate {
    constructor(public type: UpdateType, public x: number, public y: number) {
    }
}

enum UpdateType {
    Birth,
    Death,
    Nothing,
}

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
        this.changeComponentForBase((compVal) => compVal + this.randomRange(-maxPerturb, maxPerturb));
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

    private randomRange(min: number, max: number): number {
        return Math.random() * (max - min) + min;
    }
}

class Layer<T extends Cell> {
    private cells: T[][];

    constructor(width: number, height: number) {
        this.cells = new Array<T[]>(height).map(() => new Array<T>(width));
    }

    update(belowLayer: Layer<any> | null) {
        this.cells.forEach((row) => row.forEach((cell) => {
            if (belowLayer === null) cell.update();
            else cell.update(belowLayer);
        }));
    }

    draw(ctx: CanvasRenderingContext2D) {
        this.cells.forEach((row, rowNum) => row.forEach((cell, colNum) => {
            ctx.fillStyle = cell.color.cssColor();
            ctx.strokeRect(rowNum, colNum, cellSize, cellSize);
        }));
    }
}