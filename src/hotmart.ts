import envs from "./envs";
import { subscriptionsSchema } from "./schema";

let token: string | null = null;

async function getOAuthToken(
  client_id: string,
  client_secret: string,
  basicAuth: string,
) {
  const url =
    `https://api-sec-vlc.hotmart.com/security/oauth/token?grant_type=client_credentials&client_id=${client_id}&client_secret=${client_secret}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `${basicAuth}`,
      },
      redirect: "follow",
    });

    if (!response.ok) {
      throw new Error(`Auth call error! Status: ${response.status}`);
    }
    const { access_token } = await response.json();

    return access_token;
  } catch (error) {
    throw error;
  }
}

export async function getAllActiveSubs(
  planId: string,
  subscriptions: string[] = [],
  pageToken: string | null = null,
  isRetry: boolean = false,
) {
  if (!token) {
    token = await getOAuthToken(
      envs.HOTMART_API_CLIENT_ID,
      envs.HOTMART_API_CLIENT_SECRET,
      envs.HOTMART_API_TOKEN,
    );
  }

  const baseUrl = envs.PRODUCTION
    ? "https://developers.hotmart.com"
    : "https://sandbox.hotmart.com";

  const urlQuery = new URLSearchParams();

  urlQuery.append("max_results", "100");

  if (pageToken) {
    urlQuery.append("page_token", pageToken);
  }

  // urlQuery.append("plan_id", planId);
  urlQuery.append("product_id", planId);
  
  urlQuery.append("status", "ACTIVE");
  urlQuery.append("status", "CANCELLED_BY_SELLER");
  urlQuery.append("status", "CANCELLED_BY_CUSTOMER");
  urlQuery.append("status", "CANCELLED_BY_ADMIN");

  const apiUrl =
    `${baseUrl}/payments/api/v1/subscriptions?${urlQuery.toString()}`;

  const response = await fetch(
    apiUrl,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
    },
  );

  if (response.status === 401) {
    token = null;
    if (isRetry) {
      throw new Error(`Retried atuh failed`);
    }
    return getAllActiveSubs(planId, subscriptions, pageToken, true);
  }

  if (!response.ok) {
    throw new Error(
      `Api call error! Status: ${response.status} ${await response.text()}`,
    );
  }

  const data = await response.json();
  const valid = subscriptionsSchema.parse(data);

  if (valid.items) {
    valid.items.forEach((x) => subscriptions.push(x.subscriber.email));
  }

  if (valid.page_info.next_page_token) {
    return await getAllActiveSubs(
      planId,
      subscriptions,
      valid.page_info.next_page_token,
      isRetry,
    );
  }

  return subscriptions;
}
