export default {
  setserver: {
    command: 'ombi-set-server',
    usage: '`/ombi-set-server [SERVER ADDRESS]`',
    description: 'Set the Ombi Server Address',
  },
  login: {
    command: 'ombi-login',
    usage: '`/ombi-login`',
    description: 'Login to Ombi',
  },
  requests: {
    command: 'ombi-requests',
    usage: '`/ombi-requests [movie|tv|show] (filters=(all|approved|unapproved|available|unavailable|denied|released)) [QUERY]`',
    // tslint:disable-next-line:max-line-length
    description: 'Show all requests for Movies or Series, optionally filter by approved/available/denied/released, also optional filter by a query',
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
  approve: {
    command: 'ombi-approve',
    usage: '`/ombi-approve [movie|tv|show] [ID]`',
    description: 'Approve a media item by the id of the request',
  },
  deny: {
    command: 'ombi-deny',
    usage: '`/ombi-deny [movie|tv|show] [ID]`',
    description: 'Deny a media item by the id of the request',
  },
  markavailable: {
    command: 'ombi-markavailable',
    usage: '`/ombi-markavailable [movie|tv|show] [ID]`',
    description: 'Mark a media item as Available by the id of the request',
  },
  markunavailable: {
    command: 'ombi-markunavailable',
    usage: '`/ombi-markunavailable [movie|tv|show] [ID]`',
    description: 'Mark a media item as Unavailable by the id of the request',
  },
  delete: {
    command: 'ombi-delete',
    usage: '`/ombi-delete `',
    description: 'Delete a media item by the id of the request',
  },
};
