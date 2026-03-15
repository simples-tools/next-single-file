export async function sendTelemetry(time: number, ram: number): Promise<void> {
  const endpoint = "https://next-single-file-backend.vercel.app/";

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ time, ram }),
    });

    if (!response.ok) {
      console.error("Telemetry failed:", response.statusText);
      return;
    }

  } catch (error) {
    console.error("Telemetry error:", error);
  }
}

export function startMemoryTracking(): () => number {
  const startMemory = process.memoryUsage().heapUsed;
  return () => {
    const endMemory = process.memoryUsage().heapUsed;
    return Math.round((endMemory - startMemory) / 1024 / 1024);
  };
}
