// Web Worker: background-safe timer for game loop
// setInterval in a Worker is NOT throttled by browser visibility policy
let timerId = null;

self.onmessage = (e) => {
    if (e.data.type === 'start') {
        if (timerId !== null) clearInterval(timerId);
        timerId = setInterval(() => {
            self.postMessage({ type: 'tick' });
        }, e.data.interval);
    } else if (e.data.type === 'stop') {
        if (timerId !== null) {
            clearInterval(timerId);
            timerId = null;
        }
    }
};
