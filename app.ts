const minGroundPatches = 20;
const maxGroundPatches = 40;
const minPatchRadius = 3;
const maxPatchRadius = 20;

document.addEventListener("DOMContentLoaded", onLoad);

let animals: Layer<Animal>;

async function onLoad() {
    // @ts-ignore
    Math.seedrandom("1234567891011");

    let canvEl = throwOnNull(document.querySelector("canvas"), "canvEl");
    let ctx = throwOnNull(canvEl.getContext("2d"), "ctx");

    canvEl.width = document.body.clientWidth;
    canvEl.height = document.body.clientHeight;

    let ground = new Layer<GroundCell>(canvEl.width, canvEl.height);
    ground.map(() => new BareGroundCell());
    let plantCenters = new Array<[Vector, number]>(randomIntRange(minGroundPatches, maxGroundPatches));
    for (let i = 0; i < plantCenters.length; i++) {
        plantCenters[i] = [new Vector(randomIntRange(0, ground.getMax().x), randomIntRange(0, ground.getMax().y)), randomRange(minPatchRadius, maxPatchRadius)];
    }
    ground.map((x, y, current) => {
        for (let center of plantCenters) {
            if (new Vector(x, y).distance(center[0]) <= center[1])
                return new PlantGroundCell();
        }
        return current;
    });

    animals = new Layer<Animal>(canvEl.width, canvEl.height);
    animals.map((x, y, current) => {
        if (!(ground.getCell(x, y) instanceof GroundCell)) return current;
        else if (Math.random() < 0.3) return new BlueConsumer();
        // else if (Math.random() < 0.5) return new RedPredator();
        else return current;
    });

    console.log(canvEl.width + " " + canvEl.height);

    let sim = new Simulation([
        ground,
        animals,
    ], ctx);

    while (true) {
        sim.step();
        sim.draw(canvEl.width, canvEl.height);
        await sleep(1);
    }
}

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function throwOnNull<T>(something: T | null, varName: string): T {
    if (something === null) {
        let msg = varName + " cannot be null";
        alert(msg);
        throw new Error(msg + " cannot be null.")
    }
    return something;
}