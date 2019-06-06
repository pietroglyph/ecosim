abstract class GroundCell extends Cell {
    public readonly strength = Infinity;
    public readonly killable = false;

    constructor() {
        super();
    }

    update(): CellAction {
        return new DoNothingAction();
    }

    getDeathProbability(): number {
        return 0;
    }
}

class PlantGroundCell extends GroundCell {
    public readonly color: Color;

    constructor() {
        super();
        this.color = new Color(ColorBase.Other, { r: 0, g: 139, b: 0 });
    }
}

class BareGroundCell extends GroundCell {
    public readonly color: Color;

    constructor() {
        super();
        this.color = new Color(ColorBase.Other, { r: 189, g: 139, b: 20 });
    }
}

abstract class Animal extends Cell {
    isOvercrowded(neighbors: number): boolean {
        return (neighbors / (Math.pow(searchRadius, 2))) >= neighborsPerCellMinForOvercrowding && Math.random() < overcrowdingPenaltyProb;
    }
}

const searchRadius = 4;

class BlueConsumer extends Animal {
    public readonly color: Color;
    public strength = 1; // beginning strength

    constructor(color?: Color) {
        super();
        this.color = color || new Color(ColorBase.Blue);
    }

    update(currentLayer: Layer<Animal>, belowLayer: Layer<any> | null, x: number, y: number): CellAction {
        if (this.strength > birthCost) {
            let hasSuitablePartner = false;
            let partnerColor: Color | undefined;
            let babyLocation: { x: number, y: number } | undefined;
            let neighbors = 0;

            currentLayer.forEachInRadius(x, y, 4, (babyX, babyY, current): boolean => {
                if (current === null) babyLocation = { x: babyX, y: babyY };
                else if (current instanceof BlueConsumer && current.color.distance(this.color) < maxReproduceDistance) {
                    hasSuitablePartner = true;
                    partnerColor = current.color;
                }

                if (current) neighbors++;

                return babyLocation !== undefined && hasSuitablePartner !== undefined && Math.random() < cellSelectionProb;
            });

            if (this.isOvercrowded(neighbors))
                this.modifyStrength(-overcrowdingCost);

            // console.log(this.color.cssColor());
            this.color.randomPerturb(10);
            if (Math.random() < 0.01 && y > 80)
                this.color.base = ColorBase.Green;

            if (hasSuitablePartner && babyLocation !== undefined) {
                let babyColor = this.color;
                if (partnerColor && partnerColor.base == ColorBase.Green && x > 50)
                    babyColor = partnerColor;
                return new BirthAction(new BlueConsumer(babyColor), babyLocation.x, babyLocation.y);
            }
        }
        return new GrazeAction();
    }

    getFightingStrength(): number {
        return 0;
    }

    isCompatibleWith(cell: Cell): boolean {
        return cell instanceof PlantGroundCell;
    }
}

class RedPredator extends Animal {
    public readonly color = new Color(ColorBase.Red);
    public strength = 1.2; // beginning strength

    update(currentLayer: Layer<Animal>, belowLayer: Layer<any> | null, x: number, y: number): CellAction {
        let preyLocation: { x: number, y: number } | undefined;
        let moveLocation: { x: number, y: number } | undefined;
        let babyLocation: { x: number, y: number } | undefined;
        let hasSuitablePartner = false;
        let neighbors = 0;

        currentLayer.forEachInRadius(x, y, 4, (preyX, preyY, current): boolean => {
            if (current === null) {
                babyLocation = { x: preyX, y: preyY };
            } else if (current instanceof RedPredator) {
                hasSuitablePartner = true;
            } else if (distance(x, y, preyX, preyY) < maxMoveDistance) {
                preyLocation = { x: preyX, y: preyY };
            } else {
                moveLocation =
                    new Vector(preyX - x, preyY - y).setMagnitude(maxMoveDistance).constrainRange(new Vector(0, 0), currentLayer.getMax()).truncate().toObject();
                if (belowLayer && !this.isCompatibleWith(belowLayer.getCell(moveLocation.x, moveLocation.y)))
                    moveLocation = undefined;
            }

            if (current) neighbors++;

            return preyLocation !== undefined && moveLocation !== undefined && hasSuitablePartner && Math.random() < cellSelectionProb;
        });

        if (this.isOvercrowded(neighbors))
            this.modifyStrength(-overcrowdingCost);

        if (preyLocation) {
            return new PredateAction(preyLocation.x, preyLocation.y);
        } else if (moveLocation) {
            return new MoveAction(moveLocation.x, moveLocation.y);
        } else if (hasSuitablePartner && babyLocation) {
            return new BirthAction(new RedPredator(), babyLocation.x, babyLocation.y);
        } else {
            let move = new Vector(Math.random(), Math.random()).setMagnitude(maxMoveDistance).constrainRange(new Vector(0, 0), currentLayer.getMax()).truncate();
            return new MoveAction(move.x, move.y);
        }
    }

    isCompatibleWith(cell: Cell): boolean {
        return cell instanceof BareGroundCell;
    }
}