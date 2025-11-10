/* QBO OAuth helper */
// Using CommonJS require due to package export format
// eslint-disable-next-line @typescript-eslint/no-var-requires
const OAuthClient = require('intuit-oauth');

import { prisma } from './db';

type IntuitEnvironment = 'sandbox' | 'production';

export type QboToken = {
  realmId?: string;
  token_type: string;
  access_token: string;
  refresh_token: string;
  expires_in: number | string;
  x_refresh_token_expires_in?: number | string;
  id_token?: string;
  createdAt?: number; // ms epoch
};

export function getIntuitEnv(): {
  clientId: string;
  clientSecret: string;
  environment: IntuitEnvironment;
  redirectUri: string;
} {
  const clientId = process.env.INTUIT_CLIENT_ID ?? '';
  const clientSecret = process.env.INTUIT_CLIENT_SECRET ?? '';
  const environment = (process.env.INTUIT_ENVIRONMENT as IntuitEnvironment) || 'sandbox';
  const redirectUri = process.env.INTUIT_REDIRECT_URI ?? '';

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Missing INTUIT_* environment variables. Please configure INTUIT_CLIENT_ID, INTUIT_CLIENT_SECRET, INTUIT_REDIRECT_URI.');
  }

  if (environment !== 'sandbox' && environment !== 'production') {
    throw new Error('INTUIT_ENVIRONMENT must be "sandbox" or "production"');
  }

  return { clientId, clientSecret, environment, redirectUri };
}

export function createOAuthClient() {
  const { clientId, clientSecret, environment, redirectUri } = getIntuitEnv();
  const oauthClient = new OAuthClient({
    clientId,
    clientSecret,
    environment,
    redirectUri,
    logging: false,
  });
  return oauthClient as any;
}

export function getDefaultScopes(): string[] {
  // Use library-provided constants for known scopes
  try {
    return [
      OAuthClient.scopes.Accounting,
      OAuthClient.scopes.OpenId,
      OAuthClient.scopes.Email,
      OAuthClient.scopes.Profile,
    ];
  } catch {
    // Fallback to raw strings if constants shape changes
    return [
      'com.intuit.quickbooks.accounting',
      'openid',
      'email',
      'profile',
    ];
  }
}

export function parseToken(value: string | undefined): QboToken | null {
  if (!value) return null;
  try {
    const token = JSON.parse(value) as QboToken;
    return token;
  } catch {
    return null;
  }
}

export function stringifyToken(token: QboToken): string {
  const withCreated = { createdAt: Date.now(), ...token } as QboToken;
  return JSON.stringify(withCreated);
}

// Database token management functions
export async function saveTokenToDatabase(token: QboToken, userId: string): Promise<void> {
  const now = new Date();
  const expiresInMs = typeof token.expires_in === 'string' ? parseInt(token.expires_in) : token.expires_in;
  const refreshExpiresInMs = token.x_refresh_token_expires_in 
    ? (typeof token.x_refresh_token_expires_in === 'string' 
       ? parseInt(token.x_refresh_token_expires_in) 
       : token.x_refresh_token_expires_in)
    : null;

  const accessTokenExpiresAt = new Date(now.getTime() + (expiresInMs * 1000));
  const refreshTokenExpiresAt = refreshExpiresInMs 
    ? new Date(now.getTime() + (refreshExpiresInMs * 1000))
    : null;

  if (!token.realmId) {
    throw new Error('RealmId is required to save QBO token');
  }

  await prisma.qboToken.upsert({
    where: {
      userId_realmId: {
        userId,
        realmId: token.realmId,
      },
    },
    update: {
      tokenType: token.token_type,
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresIn: expiresInMs,
      refreshTokenExpiresIn: refreshExpiresInMs,
      idToken: token.id_token || null,
      accessTokenExpiresAt,
      refreshTokenExpiresAt,
      updatedAt: now,
    },
    create: {
      userId,
      realmId: token.realmId,
      tokenType: token.token_type,
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresIn: expiresInMs,
      refreshTokenExpiresIn: refreshExpiresInMs,
      idToken: token.id_token || null,
      accessTokenExpiresAt,
      refreshTokenExpiresAt,
    },
  });
}

export async function getTokenFromDatabase(userId: string, realmId?: string): Promise<QboToken | null> {
  let qboToken;
  
  if (realmId) {
    qboToken = await prisma.qboToken.findUnique({
      where: {
        userId_realmId: {
          userId,
          realmId,
        },
      },
    });
  } else {
    // Get the most recently updated token for this user
    qboToken = await prisma.qboToken.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  if (!qboToken) {
    return null;
  }

  return {
    realmId: qboToken.realmId,
    token_type: qboToken.tokenType,
    access_token: qboToken.accessToken,
    refresh_token: qboToken.refreshToken,
    expires_in: qboToken.expiresIn,
    x_refresh_token_expires_in: qboToken.refreshTokenExpiresIn || undefined,
    id_token: qboToken.idToken || undefined,
    createdAt: qboToken.createdAt.getTime(),
  };
}

export async function isTokenExpired(userId: string, realmId?: string): Promise<boolean> {
  let qboToken;
  
  if (realmId) {
    qboToken = await prisma.qboToken.findUnique({
      where: {
        userId_realmId: {
          userId,
          realmId,
        },
      },
      select: { accessTokenExpiresAt: true },
    });
  } else {
    qboToken = await prisma.qboToken.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: { accessTokenExpiresAt: true },
    });
  }

  if (!qboToken) {
    return true; // No token means it's "expired"
  }

  // Add 5 minute buffer to refresh before actual expiration
  const bufferMs = 5 * 60 * 1000;
  return new Date().getTime() > (qboToken.accessTokenExpiresAt.getTime() - bufferMs);
}

export async function refreshTokenIfNeeded(userId: string, realmId?: string): Promise<QboToken | null> {
  const expired = await isTokenExpired(userId, realmId);
  
  if (!expired) {
    return await getTokenFromDatabase(userId, realmId);
  }

  const currentToken = await getTokenFromDatabase(userId, realmId);
  if (!currentToken?.refresh_token) {
    throw new Error('No refresh token available');
  }

  const oauthClient = createOAuthClient();
  oauthClient.setToken(currentToken);

  try {
    const authResponse = await oauthClient.refresh();
    const newToken = authResponse.getToken();
    const mergedToken = { ...newToken, realmId: currentToken.realmId };
    
    await saveTokenToDatabase(mergedToken, userId);
    return mergedToken;
  } catch (error) {
    throw new Error(`Token refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getValidToken(userId: string, realmId?: string): Promise<QboToken | null> {
  try {
    return await refreshTokenIfNeeded(userId, realmId);
  } catch (error) {
    console.error('Failed to get valid token:', error);
    return null;
  }
}

export async function revokeToken(userId: string, realmId?: string): Promise<void> {
  const token = await getTokenFromDatabase(userId, realmId);
  if (!token) {
    throw new Error('No token found to revoke');
  }

  const oauthClient = createOAuthClient();
  oauthClient.setToken(token);

  try {
    await oauthClient.revoke();
    
    // Delete from database
    if (realmId) {
      await prisma.qboToken.delete({
        where: {
          userId_realmId: {
            userId,
            realmId,
          },
        },
      });
    } else if (token.realmId) {
      await prisma.qboToken.delete({
        where: {
          userId_realmId: {
            userId,
            realmId: token.realmId,
          },
        },
      });
    }
  } catch (error) {
    throw new Error(`Token revocation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

