import { vi } from 'vitest';

(globalThis as any).__DEV__ = false;

vi.mock('react-native', async () => {
  return {
    Platform: { OS: 'ios', select: (value: any) => value?.ios ?? value?.default },
  };
});
