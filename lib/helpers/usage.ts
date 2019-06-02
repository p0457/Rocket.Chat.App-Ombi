export default {
  setserver: {
    command: 'ombi-set-server',
    usage: '`/ombi-set-server [SERVER ADDRESS]`',
    description: 'Set the Ombi Server Address',
  },
  login: {
    command: 'ombi-login',
    usage: '`/ombi-login [USERNAME] [PASSWORD]`',
    description: 'Login to Ombi',
  },
  requests: {
    command: 'ombi-requests',
    usage: '`/ombi-requests [movie|tv|show] (approved|unapproved|available|unavailable|denied)`',
    description: 'Show all requests for Movies or Series, optionally filter by approved/available/denied',
  },
  request: {
    command: 'ombi-request',
    usage: '`/ombi-search [movie|tv|show] [QUERY]`',
    description: 'Search Ombi for Movies or Series',
  },
  search: {
    command: 'ombi-search',
    usage: '`/ombi-request [movie|tv|show] [ID] (first|latest|all)`',
    description: 'Request a movie using type and id (get id using `/ombi-search`); If series, specify first, latest, or all season(s)',
  },
};
