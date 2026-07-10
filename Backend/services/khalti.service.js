const getKhaltiSecretKey = () => String(process.env.KHALTI_SECRET_KEY || '').trim();

const getKhaltiBaseUrl = () =>
  String(process.env.KHALTI_API_BASE_URL || 'https://dev.khalti.com').replace(/\/$/, '');

const buildHeaders = () => ({
  Authorization: `Key ${getKhaltiSecretKey()}`,
  'Content-Type': 'application/json',
});

const safeJson = async (response) => {
  try {
    return await response.json();
  } catch (error) {
    return null;
  }
};

const isKhaltiSelfUrl = (value) => /(^|\/\/)(www\.)?khalti\.com/i.test(String(value || ''));

const isHttpUrl = (value) => {
  try {
    const parsed = new URL(String(value || '').trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (error) {
    return false;
  }
};

const lookupKhaltiByPidx = async (pidx) => {
  const response = await fetch(`${getKhaltiBaseUrl()}/api/v2/epayment/lookup/`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ pidx }),
  });

  const data = await safeJson(response);
  return { response, data };
};

const initiateKhalti = async (payload) => {
  const response = await fetch(`${getKhaltiBaseUrl()}/api/v2/epayment/initiate/`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await safeJson(response);
  return { response, data };
};

const isKhaltiFailedStatus = (status) =>
  ['expired', 'refunded', 'canceled', 'cancelled', 'failed'].includes(
    String(status || '').toLowerCase()
  );

const resolveKhaltiUrls = ({ returnUrl, websiteUrl }) => {
  const fallbackReturnUrl = String(
    process.env.KHALTI_RETURN_URL || 'https://example.com/khalti-return'
  ).trim();
  const fallbackWebsiteUrl = String(process.env.KHALTI_WEBSITE_URL || 'https://example.com').trim();
  const requestedReturnUrl = String(returnUrl || '').trim();
  const requestedWebsiteUrl = String(websiteUrl || '').trim();

  const resolvedReturnUrl = isHttpUrl(requestedReturnUrl) ? requestedReturnUrl : fallbackReturnUrl;
  const resolvedWebsiteUrl = isHttpUrl(requestedWebsiteUrl) ? requestedWebsiteUrl : fallbackWebsiteUrl;

  return {
    resolvedReturnUrl,
    resolvedWebsiteUrl,
    valid: isHttpUrl(resolvedReturnUrl) && isHttpUrl(resolvedWebsiteUrl),
    usesKhaltiSelfUrl: isKhaltiSelfUrl(resolvedReturnUrl) || isKhaltiSelfUrl(resolvedWebsiteUrl),
  };
};

module.exports = {
  getKhaltiSecretKey,
  lookupKhaltiByPidx,
  initiateKhalti,
  isKhaltiFailedStatus,
  resolveKhaltiUrls,
};
