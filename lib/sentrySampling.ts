const DEFAULT_TRACES_SAMPLE_RATE = 0.1;

export function getSentryTracesSampleRate(value: string | undefined): number {
  if (value === undefined || value.trim() === '') {
    return DEFAULT_TRACES_SAMPLE_RATE;
  }

  const sampleRate = Number(value);
  if (!Number.isFinite(sampleRate) || sampleRate < 0 || sampleRate > 1) {
    throw new Error(
      'NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE must be a number between 0 and 1.',
    );
  }

  return sampleRate;
}
