export type {
  Breadcrumb,
  BreadcrumbHint,
  PolymorphicRequest,
  Request,
  SdkInfo,
  Event,
  EventHint,
  ErrorEvent,
  Exception,
  Session,
  SeverityLevel,
  Span,
  StackFrame,
  Stacktrace,
  Thread,
  User,
} from '@sentry/types';
export type { AddRequestDataToEventOptions } from '@sentry/utils';

export {
  addEventProcessor,
  addBreadcrumb,
  addIntegration,
  captureException,
  captureEvent,
  captureMessage,
  captureCheckIn,
  captureFeedback,
  startSession,
  captureSession,
  endSession,
  withMonitor,
  createTransport,
  // eslint-disable-next-line deprecation/deprecation
  getCurrentHub,
  getClient,
  isInitialized,
  getCurrentScope,
  getGlobalScope,
  getIsolationScope,
  setCurrentClient,
  Scope,
  SDK_VERSION,
  setContext,
  setExtra,
  setExtras,
  setTag,
  setTags,
  setUser,
  getSpanStatusFromHttpCode,
  setHttpStatus,
  withScope,
  withIsolationScope,
  makeNodeTransport,
  NodeClient,
  defaultStackParser,
  flush,
  close,
  getSentryRelease,
  addRequestDataToEvent,
  DEFAULT_USER_INCLUDES,
  extractRequestData,
  createGetModuleFromFilename,
  anrIntegration,
  consoleIntegration,
  httpIntegration,
  nativeNodeFetchIntegration,
  onUncaughtExceptionIntegration,
  onUnhandledRejectionIntegration,
  modulesIntegration,
  contextLinesIntegration,
  nodeContextIntegration,
  localVariablesIntegration,
  requestDataIntegration,
  functionToStringIntegration,
  inboundFiltersIntegration,
  linkedErrorsIntegration,
  setMeasurement,
  getActiveSpan,
  startSpan,
  startInactiveSpan,
  startSpanManual,
  withActiveSpan,
  getRootSpan,
  getSpanDescendants,
  continueTrace,
  getAutoPerformanceIntegrations,
  cron,
  metrics,
  parameterize,
  SEMANTIC_ATTRIBUTE_SENTRY_OP,
  SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN,
  SEMANTIC_ATTRIBUTE_SENTRY_SOURCE,
  SEMANTIC_ATTRIBUTE_SENTRY_SAMPLE_RATE,
  expressIntegration,
  expressErrorHandler,
  setupExpressErrorHandler,
  fastifyIntegration,
  setupFastifyErrorHandler,
  koaIntegration,
  setupKoaErrorHandler,
  connectIntegration,
  setupConnectErrorHandler,
  graphqlIntegration,
  mongoIntegration,
  mongooseIntegration,
  mysqlIntegration,
  mysql2Integration,
  nestIntegration,
  setupNestErrorHandler,
  postgresIntegration,
  prismaIntegration,
  hapiIntegration,
  setupHapiErrorHandler,
  spotlightIntegration,
  initOpenTelemetry,
  spanToJSON,
  spanToTraceHeader,
  trpcMiddleware,
  addOpenTelemetryInstrumentation,
} from '@sentry/node';

export {
  captureConsoleIntegration,
  debugIntegration,
  dedupeIntegration,
  extraErrorDataIntegration,
  rewriteFramesIntegration,
  sessionTimingIntegration,
} from '@sentry/core';

export type { BunOptions } from './types';

export { BunClient } from './client';
export { getDefaultIntegrations, init } from './sdk';
export { bunServerIntegration } from './integrations/bunserver';
export { makeFetchTransport } from './transports';
