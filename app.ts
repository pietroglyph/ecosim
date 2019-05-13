'use strict';

document.addEventListener("DOMContentLoaded", () => {
    let canvEl = throwOnNull(document.querySelector("canvas"), "canvEl");
    let ctx = throwOnNull(canvEl.getContext("2d"), "ctx");

    canvEl.width = document.body.clientWidth;
    canvEl.height = document.body.clientHeight;

    new Simulation([
        new Layer<GroundCell>(canvEl.width, canvEl.height),
        
    ], ctx)
});

function throwOnNull<T>(something: T | null, varName: string): T {
    if (something === null) {
        let msg = varName + " cannot be null";
        alert(msg);
        throw new Error(msg + " cannot be null.")
    }
    return something;
}