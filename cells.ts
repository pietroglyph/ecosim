class GroundCell extends Cell {
    public readonly color: Color;
    public readonly strength = Infinity;
    public readonly killable = false;

    constructor() {
        super();
        this.color = new Color(ColorBase.Other, { r: 189, g: 139, b: 20 });
    }

    update(): CellAction {
        return new DoNothingAction();
    }

    getDeathProbability(): number {
        return 0;
    }
}

abstract class Animal extends Cell {
}

class GreenProducer extends Animal {
    public readonly color = new Color(ColorBase.Green);
    public strength = 1; // beginning strength

    update(currentLayer: Layer<Animal>, belowLayer: Layer<any> | null, x: number, y: number): CellAction {
        if (this.strength > birthCost) {
            let hasSuitablePartner = false;
            let babyLocation: { x: number, y: number } | undefined;

            currentLayer.forEachInRadius(x, y, 4, (babyX, babyY, current) => {
                if (current === null) babyLocation = { x: babyX, y: babyY };
                else if (current instanceof GreenProducer) hasSuitablePartner = true;
            });

            if (hasSuitablePartner && babyLocation !== undefined)
                return new BirthAction(new GreenProducer(), babyLocation.x, babyLocation.y);
        }
        return new PhotosynthesizeAction();
    }

    getFightingStrength(): number {
        return 0;
    }
}

class RedPredator extends Animal {
    public readonly color = new Color(ColorBase.Red);
    public strength = 20; // beginning strength

    update(currentLayer: Layer<Animal>, belowLayer: Layer<any> | null, x: number, y: number): CellAction {
        let preyLocation: { x: number, y: number } | undefined;
        let moveLocation: { x: number, y: number } | undefined;

        currentLayer.forEachInRadius(x, y, 10, (preyX, preyY, current) => {
            if (current === null) return;

            if (distance(x, y, preyX, preyY) < maxMoveDistance) {
                preyLocation = { x: preyX, y: preyY };
            } else {
                moveLocation =
                    new Vector(preyX - x, preyY - y).setMagnitude(maxMoveDistance).truncate().toObject();
            }
        });

        if (preyLocation) {
            return new PredateAction(preyLocation.x, preyLocation.y);
        } else if (moveLocation)
            return new MoveAction(moveLocation.x, moveLocation.y);
        else {
            let move = new Vector(Math.random(), Math.random()).setMagnitude(maxMoveDistance);
            return new MoveAction(move.x, move.y);
        }
    }
}