'use strict';

document.addEventListener("DOMContentLoaded", onLoad);

async function onLoad() {
    let canvEl = throwOnNull(document.querySelector("canvas"), "canvEl");
    let ctx = throwOnNull(canvEl.getContext("2d"), "ctx");

    canvEl.width = document.body.clientWidth;
    canvEl.height = document.body.clientHeight;

    let ground = new Layer<GroundCell>(canvEl.width, canvEl.height);
    ground.map(() => new GroundCell());

    let animals = new Layer<Animal>(canvEl.width, canvEl.height);
    animals.map((_, __, current) => {
        if (Math.random() < 0.3) return new GreenProducer();
        else if (Math.random() < 0.5) return new RedPredator();
        else return current;
    });

    let sim = new Simulation([
        ground,
        animals,
    ], ctx);

    while (true) {
        sim.step();
        sim.draw();
        await sleep(10);
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