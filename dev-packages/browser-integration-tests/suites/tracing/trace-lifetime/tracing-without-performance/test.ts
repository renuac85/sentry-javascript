import { expect } from '@playwright/test';
import type { Event } from '@sentry/types';
import { sentryTest } from '../../../../utils/fixtures';
import { getFirstSentryEnvelopeRequest, shouldSkipTracingTest } from '../../../../utils/helpers';

const META_TAG_TRACE_ID = '12345678901234567890123456789012';
const META_TAG_PARENT_SPAN_ID = '1234567890123456';
const META_TAG_BAGGAGE =
  'sentry-trace_id=12345678901234567890123456789012,sentry-public_key=public,sentry-release=1.0.0,sentry-environment=prod';

sentryTest('error has new traceId after navigation', async ({ getLocalTestPath, page }) => {
  if (shouldSkipTracingTest()) {
    sentryTest.skip();
  }

  const url = await getLocalTestPath({ testDir: __dirname });
  await page.goto(url);

  const errorEventPromise = getFirstSentryEnvelopeRequest<Event>(page);
  await page.locator('#errorBtn').click();
  const errorEvent = await errorEventPromise;

  expect(errorEvent.contexts?.trace).toEqual({
    trace_id: META_TAG_TRACE_ID,
    parent_span_id: META_TAG_PARENT_SPAN_ID,
    span_id: expect.stringMatching(/^[0-9a-f]{16}$/),
  });

  const errorEventPromise2 = getFirstSentryEnvelopeRequest<Event>(page, `${url}#navigation`);
  await page.locator('#errorBtn').click();
  const errorEvent2 = await errorEventPromise2;

  expect(errorEvent2.contexts?.trace).toEqual({
    trace_id: expect.stringMatching(/^[0-9a-f]{32}$/),
    span_id: expect.stringMatching(/^[0-9a-f]{16}$/),
  });
  expect(errorEvent2.contexts?.trace?.trace_id).not.toBe(META_TAG_TRACE_ID);
});

sentryTest('outgoing fetch requests have new traceId after navigation', async ({ getLocalTestPath, page }) => {
  if (shouldSkipTracingTest()) {
    sentryTest.skip();
  }

  const url = await getLocalTestPath({ testDir: __dirname });
  await page.goto(url);

  const requestPromise = page.waitForRequest('http://example.com/*');
  await page.locator('#fetchBtn').click();
  const request = await requestPromise;
  const headers = request.headers();

  // sampling decision is deferred because TwP means we didn't sample any span
  expect(headers['sentry-trace']).toMatch(new RegExp(`^${META_TAG_TRACE_ID}-[0-9a-f]{16}$`));
  expect(headers['baggage']).toBe(META_TAG_BAGGAGE);

  await page.goto(`${url}#navigation`);

  const requestPromise2 = page.waitForRequest('http://example.com/*');
  await page.locator('#fetchBtn').click();
  const request2 = await requestPromise2;
  const headers2 = request2.headers();

  // sampling decision is deferred because TwP means we didn't sample any span
  expect(headers2['sentry-trace']).toMatch(/^[0-9a-f]{32}-[0-9a-f]{16}$/);
  expect(headers2['baggage']).not.toBe(`${META_TAG_TRACE_ID}-${META_TAG_PARENT_SPAN_ID}`);
  expect(headers2['baggage']).toMatch(
    /sentry-environment=production,sentry-public_key=public,sentry-trace_id=[0-9a-f]{32}/,
  );
  expect(headers2['baggage']).not.toContain(`sentry-trace_id=${META_TAG_TRACE_ID}`);
});

sentryTest('outgoing XHR requests have new traceId after navigation', async ({ getLocalTestPath, page }) => {
  if (shouldSkipTracingTest()) {
    sentryTest.skip();
  }

  const url = await getLocalTestPath({ testDir: __dirname });
  await page.goto(url);

  const requestPromise = page.waitForRequest('http://example.com/*');
  await page.locator('#xhrBtn').click();
  const request = await requestPromise;
  const headers = request.headers();

  // sampling decision is deferred because TwP means we didn't sample any span
  expect(headers['sentry-trace']).toMatch(new RegExp(`^${META_TAG_TRACE_ID}-[0-9a-f]{16}$`));
  expect(headers['baggage']).toBe(META_TAG_BAGGAGE);

  await page.goto(`${url}#navigation`);

  const requestPromise2 = page.waitForRequest('http://example.com/*');
  await page.locator('#xhrBtn').click();
  const request2 = await requestPromise2;
  const headers2 = request2.headers();

  // sampling decision is deferred because TwP means we didn't sample any span
  expect(headers2['sentry-trace']).toMatch(/^[0-9a-f]{32}-[0-9a-f]{16}$/);
  expect(headers2['baggage']).not.toBe(`${META_TAG_TRACE_ID}-${META_TAG_PARENT_SPAN_ID}`);
  expect(headers2['baggage']).toMatch(
    /sentry-environment=production,sentry-public_key=public,sentry-trace_id=[0-9a-f]{32}/,
  );
  expect(headers2['baggage']).not.toContain(`sentry-trace_id=${META_TAG_TRACE_ID}`);
});
