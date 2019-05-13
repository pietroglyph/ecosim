class GroundCell implements Cell {
    color: Color;

    constructor() {
        this.color = new Color(ColorBase.Other, {r: 0, g: 0, b: 0});
    }

    update(belowLayer: Layer<any>): CellUpdate;
    update(): void;
    update(belowLayer?: Layer<any>): CellUpdate | void {
        // Ground does nothing
    }
}

class AnimalCell implements Cell {
    constructor(public color: Color) {
    }

    update(belowLayer: Layer<any>): CellUpdate;
    update(): void;
    update(belowLayer?: Layer<any>): CellUpdate {
        if (!belowLayer) throw new Error("AnimalCells must have a layer below them");
        return new CellUpdate(UpdateType.Birth, 0, 0)
    }


}