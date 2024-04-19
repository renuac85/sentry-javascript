import { expect } from '@playwright/test';
import type { SpanEnvelope } from '@sentry/types';

import { sentryTest } from '../../../../../utils/fixtures';
import {
  getFirstSentryEnvelopeRequest,
  properFullEnvelopeRequestParser,
  shouldSkipTracingTest,
} from '../../../../../utils/helpers';

sentryTest('sends a segment-less span envelope', async ({ getLocalTestPath, page }) => {
  if (shouldSkipTracingTest()) {
    sentryTest.skip();
  }

  const url = await getLocalTestPath({ testDir: __dirname });
  const spanEnvelope = await getFirstSentryEnvelopeRequest<SpanEnvelope>(page, url, properFullEnvelopeRequestParser);

  const envelopeHeaders = spanEnvelope[0];
  const item = spanEnvelope[1][0];

  const itemHeader = item[0];
  const spanJson = item[1];

  expect(envelopeHeaders).toEqual({
    sent_at: expect.any(String),
    trace: {
      environment: 'production',
      public_key: 'public',
      sample_rate: '1',
      sampled: 'true',
      trace_id: spanJson.trace_id,
      transaction: 'standalone_span',
    },
  });

  expect(itemHeader).toEqual({
    type: 'span',
  });

  expect(spanJson).toEqual({
    data: {
      'sentry.origin': 'manual',
      'sentry.sample_rate': 1,
      'sentry.source': 'custom',
    },
    description: 'standalone_span',
    origin: 'manual',
    span_id: expect.stringMatching(/^[0-9a-f]{16}$/),
    start_timestamp: expect.any(Number),
    timestamp: expect.any(Number),
    trace_id: expect.stringMatching(/^[0-9a-f]{32}$/),
  });
});
