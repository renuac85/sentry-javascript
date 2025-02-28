import { expect } from '@playwright/test';
import { sentryTest } from '../../../../utils/fixtures';
import type { EventAndTraceHeader } from '../../../../utils/helpers';
import {
  eventAndTraceHeaderRequestParser,
  getFirstSentryEnvelopeRequest,
  getMultipleSentryEnvelopeRequests,
  shouldSkipTracingTest,
} from '../../../../utils/helpers';

sentryTest(
  'should create a new trace for a navigation after the initial pageload',
  async ({ getLocalTestPath, page }) => {
    if (shouldSkipTracingTest()) {
      sentryTest.skip();
    }

    const url = await getLocalTestPath({ testDir: __dirname });

    const [pageloadEvent, pageloadTraceHeaders] = await getFirstSentryEnvelopeRequest<EventAndTraceHeader>(
      page,
      url,
      eventAndTraceHeaderRequestParser,
    );
    const [navigationEvent, navigationTraceHeaders] = await getFirstSentryEnvelopeRequest<EventAndTraceHeader>(
      page,
      `${url}#foo`,
      eventAndTraceHeaderRequestParser,
    );

    const pageloadTraceContext = pageloadEvent.contexts?.trace;
    const navigationTraceContext = navigationEvent.contexts?.trace;

    expect(pageloadTraceContext).toMatchObject({
      op: 'pageload',
      trace_id: expect.stringMatching(/^[0-9a-f]{32}$/),
      span_id: expect.stringMatching(/^[0-9a-f]{16}$/),
    });
    expect(pageloadTraceContext).not.toHaveProperty('parent_span_id');

    expect(pageloadTraceHeaders).toEqual({
      environment: 'production',
      public_key: 'public',
      sample_rate: '1',
      sampled: 'true',
      trace_id: pageloadTraceContext?.trace_id,
    });

    expect(navigationTraceContext).toMatchObject({
      op: 'navigation',
      trace_id: expect.stringMatching(/^[0-9a-f]{32}$/),
      span_id: expect.stringMatching(/^[0-9a-f]{16}$/),
    });
    expect(navigationTraceContext).not.toHaveProperty('parent_span_id');

    expect(navigationTraceHeaders).toEqual({
      environment: 'production',
      public_key: 'public',
      sample_rate: '1',
      sampled: 'true',
      trace_id: navigationTraceContext?.trace_id,
    });

    expect(pageloadTraceContext?.span_id).not.toEqual(navigationTraceContext?.span_id);
  },
);

sentryTest('error after pageload has pageload traceId', async ({ getLocalTestPath, page }) => {
  if (shouldSkipTracingTest()) {
    sentryTest.skip();
  }

  const url = await getLocalTestPath({ testDir: __dirname });

  const [pageloadEvent, pageloadTraceHeader] = await getFirstSentryEnvelopeRequest<EventAndTraceHeader>(
    page,
    url,
    eventAndTraceHeaderRequestParser,
  );
  const pageloadTraceContext = pageloadEvent.contexts?.trace;

  expect(pageloadTraceContext).toMatchObject({
    op: 'pageload',
    trace_id: expect.stringMatching(/^[0-9a-f]{32}$/),
    span_id: expect.stringMatching(/^[0-9a-f]{16}$/),
  });
  expect(pageloadTraceContext).not.toHaveProperty('parent_span_id');

  expect(pageloadTraceHeader).toEqual({
    environment: 'production',
    public_key: 'public',
    sample_rate: '1',
    sampled: 'true',
    trace_id: pageloadTraceContext?.trace_id,
  });

  const errorEventPromise = getFirstSentryEnvelopeRequest<EventAndTraceHeader>(
    page,
    undefined,
    eventAndTraceHeaderRequestParser,
  );
  await page.locator('#errorBtn').click();
  const [errorEvent, errorTraceHeader] = await errorEventPromise;

  const errorTraceContext = errorEvent.contexts?.trace;

  expect(errorTraceContext).toEqual({
    trace_id: pageloadTraceContext?.trace_id,
    span_id: expect.stringMatching(/^[0-9a-f]{16}$/),
  });

  expect(errorTraceHeader).toEqual({
    environment: 'production',
    public_key: 'public',
    sample_rate: '1',
    sampled: 'true',
    trace_id: pageloadTraceContext?.trace_id,
  });
});

sentryTest('error during pageload has pageload traceId', async ({ getLocalTestPath, page }) => {
  if (shouldSkipTracingTest()) {
    sentryTest.skip();
  }

  const url = await getLocalTestPath({ testDir: __dirname });

  const envelopeRequestsPromise = getMultipleSentryEnvelopeRequests<EventAndTraceHeader>(
    page,
    2,
    undefined,
    eventAndTraceHeaderRequestParser,
  );
  await page.goto(url);
  await page.locator('#errorBtn').click();
  const envelopes = await envelopeRequestsPromise;

  const [pageloadEvent, pageloadTraceHeader] = envelopes.find(
    eventAndHeader => eventAndHeader[0].type === 'transaction',
  )!;
  const [errorEvent, errorTraceHeader] = envelopes.find(eventAndHeader => !eventAndHeader[0].type)!;

  const pageloadTraceContext = pageloadEvent?.contexts?.trace;
  expect(pageloadTraceContext).toMatchObject({
    op: 'pageload',
    trace_id: expect.stringMatching(/^[0-9a-f]{32}$/),
    span_id: expect.stringMatching(/^[0-9a-f]{16}$/),
  });
  expect(pageloadTraceContext).not.toHaveProperty('parent_span_id');

  expect(pageloadTraceHeader).toEqual({
    environment: 'production',
    public_key: 'public',
    sample_rate: '1',
    sampled: 'true',
    trace_id: pageloadTraceContext?.trace_id,
  });

  const errorTraceContext = errorEvent?.contexts?.trace;
  expect(errorTraceContext).toEqual({
    data: {
      'sentry.op': 'pageload',
      'sentry.origin': 'auto.pageload.browser',
      'sentry.sample_rate': 1,
      'sentry.source': 'url',
    },
    op: 'pageload',
    origin: 'auto.pageload.browser',
    trace_id: pageloadTraceContext?.trace_id,
    span_id: expect.stringMatching(/^[0-9a-f]{16}$/),
  });

  expect(errorTraceHeader).toEqual({
    environment: 'production',
    public_key: 'public',
    sample_rate: '1',
    sampled: 'true',
    trace_id: pageloadTraceContext?.trace_id,
  });
});

sentryTest(
  'outgoing fetch request after pageload has pageload traceId in headers',
  async ({ getLocalTestPath, page }) => {
    if (shouldSkipTracingTest()) {
      sentryTest.skip();
    }

    const url = await getLocalTestPath({ testDir: __dirname });

    const [pageloadEvent, pageloadTraceHeader] = await getFirstSentryEnvelopeRequest<EventAndTraceHeader>(
      page,
      url,
      eventAndTraceHeaderRequestParser,
    );
    const pageloadTraceContext = pageloadEvent.contexts?.trace;
    const pageloadTraceId = pageloadTraceContext?.trace_id;

    expect(pageloadTraceContext).toMatchObject({
      op: 'pageload',
      trace_id: expect.stringMatching(/^[0-9a-f]{32}$/),
      span_id: expect.stringMatching(/^[0-9a-f]{16}$/),
    });
    expect(pageloadTraceContext).not.toHaveProperty('parent_span_id');

    expect(pageloadTraceHeader).toEqual({
      environment: 'production',
      public_key: 'public',
      sample_rate: '1',
      sampled: 'true',
      trace_id: pageloadTraceId,
    });

    const requestPromise = page.waitForRequest('http://example.com/*');
    await page.locator('#fetchBtn').click();
    const request = await requestPromise;
    const headers = request.headers();

    // sampling decision and DSC are continued from the pageload span even after it ended
    expect(headers['sentry-trace']).toMatch(new RegExp(`^${pageloadTraceId}-[0-9a-f]{16}-1$`));
    expect(headers['baggage']).toEqual(
      `sentry-environment=production,sentry-public_key=public,sentry-trace_id=${pageloadTraceId},sentry-sample_rate=1,sentry-sampled=true`,
    );
  },
);

sentryTest(
  'outgoing fetch request during pageload has pageload traceId in headers',
  async ({ getLocalTestPath, page }) => {
    if (shouldSkipTracingTest()) {
      sentryTest.skip();
    }

    const url = await getLocalTestPath({ testDir: __dirname });

    const pageloadEventPromise = getFirstSentryEnvelopeRequest<EventAndTraceHeader>(
      page,
      undefined,
      eventAndTraceHeaderRequestParser,
    );
    const requestPromise = page.waitForRequest('http://example.com/*');
    await page.goto(url);
    await page.locator('#fetchBtn').click();
    const [[pageloadEvent, pageloadTraceHeader], request] = await Promise.all([pageloadEventPromise, requestPromise]);

    const pageloadTraceContext = pageloadEvent.contexts?.trace;
    const pageloadTraceId = pageloadTraceContext?.trace_id;

    expect(pageloadTraceContext).toMatchObject({
      op: 'pageload',
      trace_id: expect.stringMatching(/^[0-9a-f]{32}$/),
      span_id: expect.stringMatching(/^[0-9a-f]{16}$/),
    });
    expect(pageloadTraceContext).not.toHaveProperty('parent_span_id');

    expect(pageloadTraceHeader).toEqual({
      environment: 'production',
      public_key: 'public',
      sample_rate: '1',
      sampled: 'true',
      trace_id: pageloadTraceId,
    });

    const headers = request.headers();

    // sampling decision is propagated from active span sampling decision
    expect(headers['sentry-trace']).toMatch(new RegExp(`^${pageloadTraceId}-[0-9a-f]{16}-1$`));
    expect(headers['baggage']).toEqual(
      `sentry-environment=production,sentry-public_key=public,sentry-trace_id=${pageloadTraceId},sentry-sample_rate=1,sentry-sampled=true`,
    );
  },
);

sentryTest(
  'outgoing XHR request after pageload has pageload traceId in headers',
  async ({ getLocalTestPath, page }) => {
    if (shouldSkipTracingTest()) {
      sentryTest.skip();
    }

    const url = await getLocalTestPath({ testDir: __dirname });

    const [pageloadEvent, pageloadTraceHeader] = await getFirstSentryEnvelopeRequest<EventAndTraceHeader>(
      page,
      url,
      eventAndTraceHeaderRequestParser,
    );
    const pageloadTraceContext = pageloadEvent.contexts?.trace;
    const pageloadTraceId = pageloadTraceContext?.trace_id;

    expect(pageloadTraceContext).toMatchObject({
      op: 'pageload',
      trace_id: expect.stringMatching(/^[0-9a-f]{32}$/),
      span_id: expect.stringMatching(/^[0-9a-f]{16}$/),
    });
    expect(pageloadTraceContext).not.toHaveProperty('parent_span_id');

    expect(pageloadTraceHeader).toEqual({
      environment: 'production',
      public_key: 'public',
      sample_rate: '1',
      sampled: 'true',
      trace_id: pageloadTraceId,
    });

    const requestPromise = page.waitForRequest('http://example.com/*');
    await page.locator('#xhrBtn').click();
    const request = await requestPromise;
    const headers = request.headers();

    // sampling decision and DSC are continued from the pageload span even after it ended
    expect(headers['sentry-trace']).toMatch(new RegExp(`^${pageloadTraceId}-[0-9a-f]{16}-1$`));
    expect(headers['baggage']).toEqual(
      `sentry-environment=production,sentry-public_key=public,sentry-trace_id=${pageloadTraceId},sentry-sample_rate=1,sentry-sampled=true`,
    );
  },
);

sentryTest(
  'outgoing XHR request during pageload has pageload traceId in headers',
  async ({ getLocalTestPath, page }) => {
    if (shouldSkipTracingTest()) {
      sentryTest.skip();
    }

    const url = await getLocalTestPath({ testDir: __dirname });

    const pageloadEventPromise = getFirstSentryEnvelopeRequest<EventAndTraceHeader>(
      page,
      undefined,
      eventAndTraceHeaderRequestParser,
    );
    const requestPromise = page.waitForRequest('http://example.com/*');
    await page.goto(url);
    await page.locator('#xhrBtn').click();
    const [[pageloadEvent, pageloadTraceHeader], request] = await Promise.all([pageloadEventPromise, requestPromise]);

    const pageloadTraceContext = pageloadEvent.contexts?.trace;
    const pageloadTraceId = pageloadTraceContext?.trace_id;

    expect(pageloadTraceContext).toMatchObject({
      op: 'pageload',
      trace_id: expect.stringMatching(/^[0-9a-f]{32}$/),
      span_id: expect.stringMatching(/^[0-9a-f]{16}$/),
    });
    expect(pageloadTraceContext).not.toHaveProperty('parent_span_id');

    expect(pageloadTraceHeader).toEqual({
      environment: 'production',
      public_key: 'public',
      sample_rate: '1',
      sampled: 'true',
      trace_id: pageloadTraceId,
    });

    const headers = request.headers();

    // sampling decision is propagated from active span sampling decision
    expect(headers['sentry-trace']).toMatch(new RegExp(`^${pageloadTraceId}-[0-9a-f]{16}-1$`));
    expect(headers['baggage']).toEqual(
      `sentry-environment=production,sentry-public_key=public,sentry-trace_id=${pageloadTraceId},sentry-sample_rate=1,sentry-sampled=true`,
    );
  },
);
