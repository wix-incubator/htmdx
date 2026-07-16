import { afterAll, afterEach } from 'vitest';

// Every react-dom commit schedules a passive-effects callback that reads
// window.event; callbacks still queued when vitest tears down jsdom crash
// with "window is not defined" (flaked on CI). Drain the scheduler's
// setImmediate queue after each test and again before teardown.
const drain = () => new Promise((resolve) => setImmediate(resolve));

afterEach(async () => {
  await drain();
});

afterAll(async () => {
  for (let i = 0; i < 20; i += 1) {
    await drain();
  }
});
