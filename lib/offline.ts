/** Device data for one learner. D5 snapshots and queues use this prefix. */
export function studentStoragePrefix(studentId: string) {
  return `back-on-track:student:${studentId}:`;
}

export async function clearStudentLocalData(studentId: string): Promise<boolean> {
  let cleared = true;
  const prefix = studentStoragePrefix(studentId);
  try {
    for (let index = localStorage.length - 1; index >= 0; index--) {
      const key = localStorage.key(index);
      if (key?.startsWith(prefix)) {
        try { localStorage.removeItem(key); }
        catch { cleared = false; }
      }
    }
  } catch { cleared = false; }

  try {
    if ("caches" in window) {
      const path = `/learner/${encodeURIComponent(studentId)}`;
      for (const name of await caches.keys()) {
        const cache = await caches.open(name);
        for (const request of await cache.keys()) {
          const url = new URL(request.url);
          if (url.pathname === path || url.pathname.startsWith(`${path}/`)) await cache.delete(request);
        }
      }
    }
  } catch { cleared = false; }
  return cleared;
}
