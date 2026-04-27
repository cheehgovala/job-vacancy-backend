const PAYCHANGU_API = "https://api.paychangu.com";
const SECRET_KEY = process.env.PAYCHANGU_SECRET_KEY;

// Helper: call PayChangu
export const pcFetch = async (path, init = {}) => {
  const res = await fetch(`${PAYCHANGU_API}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${SECRET_KEY}`, // Secret Key
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

  // Get raw text and parse JSON safely
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    console.error("Invalid JSON from PayChangu:", text);
    throw new Error(`Invalid response from PayChangu: ${text.substring(0, 100)}`);
  }

  // Log full response for debugging
  if (!res.ok) {
    console.error("PayChangu API Error:", {
      status: res.status,
      body: data,
    });

    // Extract readable error message
    let errorMsg =
      data?.message ||
      (typeof data?.error === "string" ? data.error : null) ||
      (data?.errors ? JSON.stringify(data.errors) : null) ||
      `PayChangu error (${res.status})`;

    throw new Error(errorMsg);
  }

  return data;
};
