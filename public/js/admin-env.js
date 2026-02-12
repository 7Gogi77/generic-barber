(function () {
  const endpoints = ['/admin-env.json', '/api/admin-env'];
  const fetchOptions = {
    headers: {
      'x-requested-with': 'admin-env-fetch'
    },
    credentials: 'same-origin',
    cache: 'no-store'
  };

  async function loadAdminEnv() {
    let lastError;

    for (const endpoint of endpoints) {
      try {
        const res = await fetch(endpoint, fetchOptions);
        if (!res.ok) {
          lastError = new Error(`Failed to load admin environment (${res.status}) from ${endpoint}`);
          continue;
        }

        const payload = await res.json();
        if (payload?.error) {
          lastError = new Error(payload.error);
          continue;
        }
        window.ADMIN_ENV = payload;
        return payload;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error('Admin environment unavailable');
  }

  const promise = loadAdminEnv();

  promise.catch(error => {
    console.error('Admin environment unavailable:', error);
    window.ADMIN_ENV_ERROR = error;
  });

  window.ADMIN_ENV_PROMISE = promise;
})();
