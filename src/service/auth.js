// Microsoft 365 sign-in for the Sussex Irrigation Service Calls app.
// Fill in CONFIG after registering the app in Sussex Irrigation's Entra.
import { PublicClientApplication, InteractionRequiredAuthError } from '@azure/msal-browser';

export const CONFIG = {
  clientId: '',            // Application (client) ID from Sussex's Entra app registration
  tenantId: '',            // Directory (tenant) ID
  siteHost: '',            // e.g. sussexirrigation.sharepoint.com
  sitePath: '/sites/ServiceCalls',
};

export const isConfigured = () => !!(CONFIG.clientId && CONFIG.tenantId && CONFIG.siteHost);

export const SCOPES = ['User.Read', 'Sites.ReadWrite.All', 'Sites.Manage.All'];

const redirectUri = `${window.location.origin}${import.meta.env.BASE_URL}`;

export const msal = isConfigured() ? new PublicClientApplication({
  auth: {
    clientId: CONFIG.clientId,
    authority: `https://login.microsoftonline.com/${CONFIG.tenantId}`,
    redirectUri,
    postLogoutRedirectUri: redirectUri,
    navigateToLoginRequestUrl: true,
  },
  cache: { cacheLocation: 'localStorage' },
}) : null;

export async function initAuth() {
  if (!msal) return null;
  await msal.initialize();
  const result = await msal.handleRedirectPromise();
  if (result?.account) msal.setActiveAccount(result.account);
  if (!msal.getActiveAccount()) {
    const [first] = msal.getAllAccounts();
    if (first) msal.setActiveAccount(first);
  }
  return msal.getActiveAccount();
}

export const signIn = () => msal.loginRedirect({ scopes: SCOPES, prompt: 'select_account' });
export const signOut = () => msal.logoutRedirect({ account: msal.getActiveAccount() });

export async function getToken() {
  const account = msal?.getActiveAccount();
  if (!account) throw new Error('Not signed in');
  try {
    return (await msal.acquireTokenSilent({ scopes: SCOPES, account })).accessToken;
  } catch (err) {
    if (err instanceof InteractionRequiredAuthError && navigator.onLine !== false) {
      await msal.acquireTokenRedirect({ scopes: SCOPES, account });
    }
    throw err;
  }
}

export function currentAccount() {
  const a = msal?.getActiveAccount();
  return a ? { name: a.name || a.username, email: a.username } : null;
}
