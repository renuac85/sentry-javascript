import { expect } from '@playwright/test';

import { sentryTest } from '../../../utils/fixtures';
import { envelopeRequestParser, getEnvelopeType, shouldSkipFeedbackTest } from '../../../utils/helpers';

sentryTest('should capture feedback', async ({ getLocalTestPath, page }) => {
  if (shouldSkipFeedbackTest()) {
    sentryTest.skip();
  }

  const feedbackRequestPromise = page.waitForResponse(res => {
    const req = res.request();

    const postData = req.postData();
    if (!postData) {
      return false;
    }

    try {
      return getEnvelopeType(req) === 'feedback';
    } catch (err) {
      return false;
    }
  });

  await page.route('https://dsn.ingest.sentry.io/**/*', route => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: 'test-id' }),
    });
  });

  const url = await getLocalTestPath({ testDir: __dirname });

  await page.goto(url);
  await page.getByText('Report a Bug').click();
  expect(await page.locator(':visible:text-is("Report a Bug")').count()).toEqual(1);
  await page.locator('[name="name"]').fill('Jane Doe');
  await page.locator('[name="email"]').fill('janedoe@example.org');
  await page.locator('[name="message"]').fill('my example feedback');
  await page.locator('[data-sentry-feedback] .btn--primary').click();

  const feedbackEvent = envelopeRequestParser((await feedbackRequestPromise).request());
  expect(feedbackEvent).toEqual({
    type: 'feedback',
    breadcrumbs: expect.any(Array),
    contexts: {
      feedback: {
        contact_email: 'janedoe@example.org',
        message: 'my example feedback',
        name: 'Jane Doe',
        source: 'widget',
        url: expect.stringContaining('/dist/index.html'),
      },
      trace: {
        trace_id: expect.stringMatching(/\w{32}/),
        span_id: expect.stringMatching(/\w{16}/),
      },
    },
    level: 'info',
    timestamp: expect.any(Number),
    event_id: expect.stringMatching(/\w{32}/),
    environment: 'production',
    sdk: {
      integrations: expect.arrayContaining(['Feedback']),
      version: expect.any(String),
      name: 'sentry.javascript.browser',
      packages: expect.anything(),
    },
    request: {
      url: expect.stringContaining('/dist/index.html'),
      headers: {
        'User-Agent': expect.stringContaining(''),
      },
    },
    platform: 'javascript',
  });
});
