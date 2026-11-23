// Microsoft 365 sign-in for the Field Reports app (Whayland tenant only).
import { PublicClientApplication, InteractionRequiredAuthError } from '@azure/msal-browser';

export const CONFIG = {
  clientId: 'efc026e1-9dc4-46ec-9c46-0dba17d0c427',
  tenantId: 'e4d3c722-fd91-46f0-99bd-2d2fe4c58ab6',
  siteHost: 'whaylandco.sharepoint.com',
  sitePath: '/sites/FieldReports',
};

export const SCOPES = ['User.Read', 'Sites.ReadWrite.All', 'Sites.Manage.All'];

const redirectUri = `${window.location.origin}${import.meta.env.BASE_URL}`;

export const msal = new PublicClientApplication({
  auth: {
    clientId: CONFIG.clientId,
    authority: `https://login.microsoftonline.com/${CONFIG.tenantId}`,
    redirectUri,
    postLogoutRedirectUri: redirectUri,
    navigateToLoginRequestUrl: true,
  },
  // Kept on the device so the app opens signed-in without signal.
  cache: { cacheLocation: 'localStorage' },
});

export async function initAuth() {
  await msal.initialize();
  const result = await msal.handleRedirectPromise();
  if (result?.account) msal.setActiveAccount(result.account);
  if (!msal.getActiveAccount()) {
    const [first] = msal.getAllAccounts();
    if (first) msal.setActiveAccount(first);
  }
  return msal.getActiveAccount();
}

// Full-page redirects work reliably on iPhone and iPad (pop-ups are blocked).
export const signIn = () => msal.loginRedirect({ scopes: SCOPES, prompt: 'select_account' });
export const signOut = () => msal.logoutRedirect({ account: msal.getActiveAccount() });

// Sending email (contracts to subs) asks for Mail.Send only when someone
// first sends, so nobody else is asked for it.
export const MAIL_SCOPES = ['Mail.Send', 'Mail.ReadWrite'];

export async function getToken(scopes = SCOPES) {
  const account = msal.getActiveAccount();
  if (!account) throw new Error('Not signed in');
  try {
    const result = await msal.acquireTokenSilent({ scopes, account });
    return result.accessToken;
  } catch (err) {
    // Only bounce to the sign-in page when there's signal; offline, saving
    // simply waits on the device and retries later.
    if (err instanceof InteractionRequiredAuthError && navigator.onLine !== false) {
      await msal.acquireTokenRedirect({ scopes, account });
    }
    throw err;
  }
}

export function currentAccount() {
  const a = msal.getActiveAccount();
  return a ? { name: a.name || a.username, email: a.username } : null;
}
