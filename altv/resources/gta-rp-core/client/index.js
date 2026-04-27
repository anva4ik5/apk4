alt.log("[client] GTA RP client started");
alt.onServer("hud:updateMoney", (cash, bank) => {
    alt.log(`[client] money updated: cash=${cash} bank=${bank}`);
});
alt.onServer("rp:error", (message) => {
    alt.log(`[client] error: ${message}`);
});
alt.onServer("rp:inventory:data", (items) => {
    alt.log(`[client] inventory: ${JSON.stringify(items)}`);
});
alt.onServer("rp:jobs:data", (jobs) => {
    alt.log(`[client] jobs: ${JSON.stringify(jobs)}`);
});
alt.onServer("rp:vehicles:data", (vehicles) => {
    alt.log(`[client] vehicles: ${JSON.stringify(vehicles)}`);
});
// Demo polling so you can see bridge communication in logs immediately.
alt.setInterval(() => {
    alt.emitServer("rp:inventory:get");
    alt.emitServer("rp:jobs:get");
    alt.emitServer("rp:vehicles:get");
}, 15000);
export {};
//# sourceMappingURL=index.js.map