import { DEMO_MODE } from "./demoMode";
import { MOCK_RESPONSES } from "./mockResponses";

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function timeout<T>(ms: number, msg: string): Promise<T> {
  return new Promise((_, reject) => setTimeout(() => reject(new Error(msg)), ms));
}

export async function aiCall<T>(
  key: keyof typeof MOCK_RESPONSES,
  realCallFn: () => Promise<T>,
  transform: (raw: string) => T,
): Promise<T> {
  const raw = MOCK_RESPONSES[key] as string;
  if (DEMO_MODE) {
    await delay(800);
    return transform(raw);
  }
  try {
    return await Promise.race([realCallFn(), timeout<T>(12_000, `AI call ${String(key)} timed out`)]);
  } catch (e) {
    console.warn(`[AI Fallback] ${String(key)}`, e);
    return transform(raw);
  }
}
