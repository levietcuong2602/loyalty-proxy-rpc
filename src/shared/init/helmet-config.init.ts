import helmet from 'helmet';

export const helmetConfig: Readonly<Parameters<typeof helmet>[0]> = {
  hidePoweredBy: true,
  noSniff: true,
  frameguard: { action: 'deny' },
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },
  crossOriginResourcePolicy: false,
};
