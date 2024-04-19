Sentry.startSpan(
  { name: 'standalone_none_segment_span', experimental: { standalone: true, segment: false } },
  () => {},
);
