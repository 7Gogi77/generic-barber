(function () {
  const endpoint = '/api/admin-env';
  const fetchOptions = {
    headers: {
      'x-requested-with': 'admin-env-fetch'
    },
    credentials: 'same-origin',
    cache: 'no-store'
  };

  const promise = fetch(endpoint, fetchOptions)
    .then(res => {
      if (!res.ok) {
        throw new Error(`Failed to load admin environment (${res.status})`);
      }
      return res.json();
    })
    .then(payload => {
      window.ADMIN_ENV = payload;
      return payload;
    })
    .catch(error => {
      console.error('Admin environment unavailable:', error);
      window.ADMIN_ENV_ERROR = error;
      throw error;
    });

  window.ADMIN_ENV_PROMISE = promise;
})();
