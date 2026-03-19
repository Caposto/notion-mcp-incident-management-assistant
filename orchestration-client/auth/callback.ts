interface CallbackParams {
  code?: string;
  state?: string;
  error?: string;
  error_description?: string;
}

function parseCallback(url: string): CallbackParams {
  const urlParams = new URLSearchParams(new URL(url).search);

  return {
    code: urlParams.get("code") || undefined,
    state: urlParams.get("state") || undefined,
    error: urlParams.get("error") || undefined,
    error_description: urlParams.get("error_description") || undefined,
  };
}

export async function handleCallback(
  callbackUrl: string,
  storedState: string,
  _codeVerifier: string,
): Promise<string> {
  const params = parseCallback(callbackUrl);

  if (params.error) {
    throw new Error(
      `OAuth error: ${params.error} - ` +
        `${params.error_description || "Unknown error"}`,
    );
  }

  if (params.state !== storedState) {
    throw new Error("Invalid state parameter - possible CSRF attack");
  }

  if (!params.code) {
    throw new Error("Missing authorization code");
  }

  return params.code;
}
