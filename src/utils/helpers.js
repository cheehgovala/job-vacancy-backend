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
