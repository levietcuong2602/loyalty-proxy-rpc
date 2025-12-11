export interface IConfig {
  env?: string;
  port: number;
  appPrefix: string;
  avalancheRpcEndpoints: string[];

  swagger: {
    prefix: string;
    account?: string;
    password?: string;
  };

  enabledLog: boolean;
}

export default (): Partial<IConfig> => ({
  port: parseInt(process.env.PORT, 10) || 80,
  appPrefix: 'api',
  avalancheRpcEndpoints: (process.env.AVALANCHE_RPC_ENDPOINTS || '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean),
  swagger: {
    prefix: process.env.SWAGGER_PREFIX || 'api-docs',
    account: process.env.SWAGGER_ACCOUNT || 'admin',
    password: process.env.SWAGGER_PASSWORD || 'admin',
  },
  enabledLog: process.env.ENABLED_LOG === '1',
});
