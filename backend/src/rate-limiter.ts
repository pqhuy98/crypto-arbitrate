let lastTime = new Date(0);
const intervalMs = 10 * 1000;

export function attempt(): boolean {
  const now = new Date();
  if (now.getTime() > lastTime.getTime() + intervalMs) {
    lastTime = now;
    return true;
  }
  return false;
}
