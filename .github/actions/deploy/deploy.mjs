import { execSync } from 'node:child_process';

const {
  APP_VERSION,
  BUILD_TYPE,
  DEPLOY_HOST,
  CANARY_DEPLOY_HOST,
  GIT_SHORT_HASH,
  DATABASE_URL,
  DATABASE_USERNAME,
  DATABASE_PASSWORD,
  DATABASE_NAME,
  DATABASE_PORT,
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  CAPTCHA_TURNSTILE_SECRET,
  METRICS_CUSTOMER_IO_TOKEN,
  COPILOT_OPENAI_API_KEY,
  COPILOT_FAL_API_KEY,
  COPILOT_UNSPLASH_API_KEY,
  MAILER_SENDER,
  MAILER_USER,
  MAILER_PASSWORD,
  AFFINE_GOOGLE_CLIENT_ID,
  AFFINE_GOOGLE_CLIENT_SECRET,
  REDIS_HOST,
  REDIS_PASSWORD,
  REDIS_PORT,
  REDIS_USERNAME,
  STRIPE_API_KEY,
  STRIPE_WEBHOOK_KEY,
  STATIC_IP_NAME,
} = process.env;

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const buildType = BUILD_TYPE || 'canary';

const isProduction = buildType === 'stable';
const isBeta = buildType === 'beta';
const isInternal = buildType === 'internal';

const replicaConfig = {
  stable: {
    web: 1,
    graphql: Number(process.env.PRODUCTION_GRAPHQL_REPLICA) || 1,
    sync: Number(process.env.PRODUCTION_SYNC_REPLICA) || 1,
    renderer: Number(process.env.PRODUCTION_RENDERER_REPLICA) || 1,
  },
  beta: {
    web: 1,
    graphql: Number(process.env.BETA_GRAPHQL_REPLICA) || 1,
    sync: Number(process.env.BETA_SYNC_REPLICA) || 1,
    renderer: Number(process.env.BETA_RENDERER_REPLICA) || 1,
  },
  canary: {
    web: 1,
    graphql: 1,
    sync: 1,
    renderer: 1,
  },
};

const cpuConfig = {
  beta: {
    web: '100m',
    graphql: '1',
    sync: '1',
    renderer: '100m',
  },
  canary: {
    web: '100m',
    graphql: '1',
    sync: '1',
    renderer: '100m',
  },
};

const createHelmCommand = ({ isDryRun }) => {
  if (!DATABASE_URL || !DATABASE_USERNAME || !DATABASE_PASSWORD || !DEPLOY_HOST) {
    throw new Error('Missing required environment variables for deployment');
  }

  const flag = isDryRun ? '--dry-run' : '--atomic';
  const imageTag = `${buildType}-${GIT_SHORT_HASH}`;

  const redisAndPostgres = [
    `--set-string global.database.url="${DATABASE_URL}"`,
    `--set-string global.database.user="${DATABASE_USERNAME}"`,
    `--set-string global.database.password="${DATABASE_PASSWORD}"`,
    `--set-string global.database.name="${DATABASE_NAME}"`,
    `--set-string global.database.port="${DATABASE_PORT}"`,
    `--set-string global.redis.host="${REDIS_HOST}"`,
    `--set-string global.redis.port="${REDIS_PORT}"`,
    `--set-string global.redis.username="${REDIS_USERNAME}"`,
    `--set-string global.redis.password="${REDIS_PASSWORD}"`,
    `--set global.redis.enabled=true`,
  ];

  const serviceAnnotations =
    isProduction || isBeta || isInternal
      ? [
          `--set-json web.service.annotations="{\\"cloud.google.com/neg\\": \\"{\\\\\\"ingress\\\\\\": true}\\"}"`,
          `--set-json graphql.service.annotations="{\\"cloud.google.com/neg\\": \\"{\\\\\\"ingress\\\\\\": true}\\"}"`,
          `--set-json sync.service.annotations="{\\"cloud.google.com/neg\\": \\"{\\\\\\"ingress\\\\\\": true}\\"}"`,
        ]
      : [];

  const cpu = cpuConfig[buildType];
  const resources = cpu
    ? [
        `--set web.resources.requests.cpu="${cpu.web}"`,
        `--set graphql.resources.requests.cpu="${cpu.graphql}"`,
        `--set sync.resources.requests.cpu="${cpu.sync}"`,
      ]
    : [];

  const replica = replicaConfig[buildType] || replicaConfig.canary;
  const namespace = 'production';
  const host = DEPLOY_HOST || CANARY_DEPLOY_HOST;

  const deployCommand = [
    `helm upgrade --install affine .github/helm/affine`,
    `--namespace ${namespace}`,
    `--set-string global.app.buildType="${buildType}"`,
    `--set global.ingress.enabled=true`,
    `--set-json global.ingress.annotations="{\\"kubernetes.io/ingress.class\\": \\"gce\\", \\"kubernetes.io/ingress.allow-http\\": \\"true\\", \\"kubernetes.io/ingress.global-static-ip-name\\": \\"${STATIC_IP_NAME}\\"}"`,
    `--set-string global.ingress.host="${host}"`,
    `--set global.objectStorage.r2.enabled=true`,
    `--set-string global.objectStorage.r2.accountId="${R2_ACCOUNT_ID}"`,
    `--set-string global.objectStorage.r2.accessKeyId="${R2_ACCESS_KEY_ID}"`,
    `--set-string global.objectStorage.r2.secretAccessKey="${R2_SECRET_ACCESS_KEY}"`,
    `--set-string global.version="${APP_VERSION}"`,
    ...redisAndPostgres,
    `--set web.replicaCount=${replica.web}`,
    `--set-string web.image.tag="${imageTag}"`,
    `--set graphql.replicaCount=${replica.graphql}`,
    `--set-string graphql.image.tag="${imageTag}"`,
    `--set graphql.app.host="${host}"`,
    `--set graphql.app.captcha.enabled=true`,
    `--set-string graphql.app.metrics.customerIo.token="${METRICS_CUSTOMER_IO_TOKEN}"`,
    `--set-string graphql.app.captcha.turnstile.secret="${CAPTCHA_TURNSTILE_SECRET}"`,
    `--set graphql.app.copilot.enabled=true`,
    `--set-string graphql.app.copilot.openai.key="${COPILOT_OPENAI_API_KEY}"`,
    `--set-string graphql.app.copilot.fal.key="${COPILOT_FAL_API_KEY}"`,
    `--set-string graphql.app.copilot.unsplash.key="${COPILOT_UNSPLASH_API_KEY}"`,
    `--set-string graphql.app.mailer.sender="${MAILER_SENDER}"`,
    `--set-string graphql.app.mailer.user="${MAILER_USER}"`,
    `--set-string graphql.app.mailer.password="${MAILER_PASSWORD}"`,
    `--set graphql.app.oauth.google.enabled=true`,
    `--set-string graphql.app.oauth.google.clientId="${AFFINE_GOOGLE_CLIENT_ID}"`,
    `--set-string graphql.app.oauth.google.clientSecret="${AFFINE_GOOGLE_CLIENT_SECRET}"`,
    `--set-string graphql.app.payment.stripe.apiKey="${STRIPE_API_KEY}"`,
    `--set-string graphql.app.payment.stripe.webhookKey="${STRIPE_WEBHOOK_KEY}"`,
    ...serviceAnnotations,
    ...resources,
    `--timeout 10m`,
    flag,
  ].join(' ');

  console.log('Helm Command:', deployCommand);

  return deployCommand;
};

const output = execSync(createHelmCommand({ isDryRun: true }), {
  encoding: 'utf-8',
  stdio: ['inherit', 'pipe', 'inherit'],
});
const templates = output
  .split('---')
  .filter(yml => !yml.split('\n').some(line => line.trim() === 'kind: Secret'))
  .join('---');
console.log(templates);

execSync(createHelmCommand({ isDryRun: false }), {
  encoding: 'utf-8',
  stdio: 'inherit',
});
