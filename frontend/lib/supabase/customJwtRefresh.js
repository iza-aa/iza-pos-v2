export const SUPABASE_ACCESS_TOKEN_TTL_SECONDS = 8 * 60 * 60;

export const getSupabaseAccessTokenCookieOptions = () => ({
  httpOnly: false,
  secure: process.env.NODE_ENV === "production",
  sameSite: /** @type {"lax"} */ ("lax"),
  path: "/",
  maxAge: 7 * 24 * 60 * 60, // 7 days (matches internal session remember me duration)
});

export const isExpiredCustomSupabaseJwtResponse = async (response) => {
  if (response.status !== 401) return false;

  const body = await response.clone().json().catch(() => null);
  return body?.code === "PGRST303";
};

export const createSupabaseTokenRefreshingFetch = ({
  fetchImpl,
  refreshPath,
  authorizeRequest,
}) => {
  let refreshPromise;

  const refreshToken = () => {
    if (!refreshPromise) {
      refreshPromise = fetchImpl(refreshPath, {
        method: "POST",
        credentials: "same-origin",
      })
        .then((response) => response.ok)
        .catch(() => false)
        .finally(() => {
          refreshPromise = undefined;
        });
    }

    return refreshPromise;
  };

  return async (url, options = {}) => {
    const initialResponse = await fetchImpl(url, authorizeRequest(options));

    if (!(await isExpiredCustomSupabaseJwtResponse(initialResponse))) {
      return initialResponse;
    }

    const refreshed = await refreshToken();
    if (!refreshed) return initialResponse;

    return fetchImpl(url, authorizeRequest(options));
  };
};
