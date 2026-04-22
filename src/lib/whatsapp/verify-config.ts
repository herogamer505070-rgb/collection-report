type VerifyConfigInput = {
  phoneNumberId: string;
  accessToken: string;
};

type VerifyConfigResult =
  | {
      ok: true;
      displayPhone: string | null;
      verifiedName: string | null;
      qualityRating: string | null;
    }
  | { ok: false; error: string };

/**
 * Calls the Meta Graph API to verify WhatsApp Business credentials.
 * Returns phone metadata on success or an error string on failure.
 *
 * Note: this is a server-side-only function. Never call it from the browser.
 */
export async function verifyWhatsAppConfig(
  input: VerifyConfigInput,
): Promise<VerifyConfigResult> {
  const { phoneNumberId, accessToken } = input;
  const url = new URL(`https://graph.facebook.com/v21.0/${phoneNumberId}`);
  url.searchParams.set(
    "fields",
    "display_phone_number,verified_name,quality_rating",
  );
  url.searchParams.set("access_token", accessToken);

  let res: Response;
  try {
    res = await fetch(url.toString(), { cache: "no-store" });
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error",
    };
  }

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = (await res.json()) as {
        error?: { message?: string };
      };
      detail = body.error?.message ?? detail;
    } catch {
      // ignore JSON parse failures
    }
    return { ok: false, error: detail };
  }

  const data = (await res.json()) as {
    display_phone_number?: string;
    verified_name?: string;
    quality_rating?: string;
  };

  return {
    ok: true,
    displayPhone: data.display_phone_number ?? null,
    verifiedName: data.verified_name ?? null,
    qualityRating: data.quality_rating ?? null,
  };
}
