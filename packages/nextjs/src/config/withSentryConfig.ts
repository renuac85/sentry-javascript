import { isThenable } from '@sentry/utils';

import type {
  ExportedNextConfig,
  NextConfigFunction,
  NextConfigObject,
  NextConfigObjectWithSentry,
  NextRewrite,
  SentryWebpackPluginOptions,
  UserSentryOptions,
} from './types';
import { constructWebpackConfigFunction } from './webpack';

let showedExportModeTunnelWarning = false;

/**
 * Add Sentry options to the config to be exported from the user's `next.config.js` file.
 *
 * @param exportedUserNextConfig The existing config to be exported prior to adding Sentry
 * @param userSentryWebpackPluginOptions Configuration for SentryWebpackPlugin
 * @param sentryOptions Optional additional options to add as alternative to `sentry` property of config
 * @returns The modified config to be exported
 */
export function withSentryConfig(
  exportedUserNextConfig: ExportedNextConfig = {},
  userSentryWebpackPluginOptions: Partial<SentryWebpackPluginOptions> = {},
  sentryOptions?: UserSentryOptions,
): NextConfigFunction | NextConfigObject {
  if (typeof exportedUserNextConfig === 'function') {
    return function (this: unknown, ...webpackConfigFunctionArgs: unknown[]): ReturnType<NextConfigFunction> {
      const maybeUserNextConfigObject: NextConfigObjectWithSentry = exportedUserNextConfig.apply(
        this,
        webpackConfigFunctionArgs,
      );

      if (isThenable(maybeUserNextConfigObject)) {
        return maybeUserNextConfigObject.then(function (userNextConfigObject: NextConfigObjectWithSentry) {
          const userSentryOptions = { ...userNextConfigObject.sentry, ...sentryOptions };
          return getFinalConfigObject(userNextConfigObject, userSentryOptions, userSentryWebpackPluginOptions);
        });
      }

      // Reassign for naming-consistency sake.
      const userNextConfigObject = maybeUserNextConfigObject;
      const userSentryOptions = { ...userNextConfigObject.sentry, ...sentryOptions };
      return getFinalConfigObject(userNextConfigObject, userSentryOptions, userSentryWebpackPluginOptions);
    };
  } else {
    const userSentryOptions = { ...exportedUserNextConfig.sentry, ...sentryOptions };
    return getFinalConfigObject(exportedUserNextConfig, userSentryOptions, userSentryWebpackPluginOptions);
  }
}

// Modify the materialized object form of the user's next config by deleting the `sentry` property and wrapping the
// `webpack` property
function getFinalConfigObject(
  incomingUserNextConfigObject: NextConfigObjectWithSentry,
  userSentryOptions: UserSentryOptions,
  userSentryWebpackPluginOptions: Partial<SentryWebpackPluginOptions>,
): NextConfigObject {
  // Next 12.2.3+ warns about non-canonical properties on `userNextConfig`.
  delete incomingUserNextConfigObject.sentry;

  setUpRewriteRules(incomingUserNextConfigObject, userSentryOptions);

  return {
    ...incomingUserNextConfigObject,
    webpack: constructWebpackConfigFunction(
      incomingUserNextConfigObject,
      userSentryWebpackPluginOptions,
      userSentryOptions,
    ),
  };
}

/**
 * Injects rewrite rules into the Next.js config.
 *
 * See https://nextjs.org/docs/api-reference/next.config.js/rewrites.
 */
function setUpRewriteRules(userNextConfig: NextConfigObject, userSentryOptions: UserSentryOptions): void {
  const originalRewrites = userNextConfig.rewrites;

  // This function doesn't take any arguments at the time of writing but we future-proof
  // here in case Next.js ever decides to pass some
  userNextConfig.rewrites = async (...args: unknown[]) => {
    const rewritesToInject: NextRewrite[] = [];

    // Tunnel envelopes through the user's server.
    if (userSentryOptions?.tunnelRoute) {
      if (userNextConfig.output === 'export') {
        if (!showedExportModeTunnelWarning) {
          showedExportModeTunnelWarning = true;
          // eslint-disable-next-line no-console
          console.warn(
            '[@sentry/nextjs] The Sentry Next.js SDK `tunnelRoute` option will not work in combination with Next.js static exports. The `tunnelRoute` option uses serverside features that cannot be accessed in export mode. If you still want to tunnel Sentry events, set up your own tunnel: https://docs.sentry.io/platforms/javascript/troubleshooting/#using-the-tunnel-option',
          );
        }
      } else {
        rewritesToInject.push({
          // Matched rewrite routes will look like the following: `[tunnelPath]?o=[orgid]&p=[projectid]`
          // Nextjs will automatically convert `source` into a regex for us
          source: `${userSentryOptions.tunnelRoute}(/?)`,
          has: [
            {
              type: 'query',
              key: 'o', // short for orgId - we keep it short so matching is harder for ad-blockers
              value: '(?<orgid>\\d*)',
            },
            {
              type: 'query',
              key: 'p', // short for projectId - we keep it short so matching is harder for ad-blockers
              value: '(?<projectid>\\d*)',
            },
          ],
          destination: 'https://o:orgid.ingest.sentry.io/api/:projectid/envelope/?hsts=0',
        });
      }
    }

    // Block requests to sourcemaps.
    if (userSentryOptions?.hideSourceMaps && userNextConfig.output !== 'export') {
      rewritesToInject.push({
        source: '/:anyPath(.*).map',
        destination: '/404',
      });
    }

    if (typeof originalRewrites !== 'function') {
      return [...rewritesToInject];
    }

    // @ts-expect-error Expected 0 arguments but got 1 - this is from the future-proofing mentioned above, so we don't care about it
    const originalRewritesResult = await originalRewrites(...args);

    if (Array.isArray(originalRewritesResult)) {
      return [...rewritesToInject, ...originalRewritesResult];
    } else {
      return {
        ...originalRewritesResult,
        beforeFiles: [...rewritesToInject, ...(originalRewritesResult.beforeFiles || [])],
      };
    }
  };
}
