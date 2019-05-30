import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { ISlashCommand, SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';
import * as msgHelper from '../lib/helpers/messageHelper';
import { AppPersistence } from '../lib/persistence';
import { OmbiApp } from '../OmbiApp';

enum Command {
  Help = 'help',
  SetServer = 'set-server',
  Login = 'login',
  Requests = 'requests',
  Search = 'search',
  Request = 'request',
}

export class OmbiCommand implements ISlashCommand {
  public command = 'ombi';
  public i18nParamsExample = 'slashcommand_params';
  public i18nDescription = 'slashcommand_description';
  public providesPreview = false;

  public constructor(private readonly app: OmbiApp) {}

  public async executor(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
    const [command] = context.getArguments();

    switch (command) {
      case Command.Help:
        await this.processHelpCommand(context, read, modify, http, persis);
        break;
      case Command.SetServer:
        await this.processSetServersCommand(context, read, modify, http, persis);
        break;
      case Command.Login:
        await this.processLoginCommand(context, read, modify, http, persis);
        break;
      case Command.Requests:
        await this.processRequestsCommand(context, read, modify, http, persis);
        break;
      case Command.Search:
        await this.processSearchCommand(context, read, modify, http, persis);
        break;
      case Command.Request:
        await this.processRequestCommand(context, read, modify, http, persis);
        break;
      default:
        await this.processHelpCommand(context, read, modify, http, persis);
        break;
    }
  }

  private async processHelpCommand(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
    await msgHelper.sendNotificationSingleAttachment({
      collapsed: false,
      color: '#e37200',
      title: {
        value: 'Ombi App Help Commands',
      },
      text: '`/ombi help`\n>Show this help menu\n'
        + '`/ombi set-server [SERVER ADDRESS]`\n>Set the Ombi Server Address\n'
        + '`/ombi login [USERNAME] [PASSWORD]`\n>Login to Ombi\n'
        // tslint:disable-next-line:max-line-length
        + '`/ombi requests (movie|tv|show) (approved|unapproved|available|unavailable|denied)`\n>Show all requests for Movies or Series, optionally filter by approved/available/denied\n'
        + '`/ombi search (movie|tv|show) [QUERY]`\n>Search Ombi for Movies or Series\n'
        + '`/ombi request (movie|tv|show) [ID] (first|latest|all)`'
        + '\n\nFirst, set your server with `set-server`. Then, login using `login`.\n'
        + 'View your requests with `requests`, or make a new request by searching using `search`, getting'
        + 'the id, and using that to generate the request using `request`.',
    }, read, modify, context.getSender(), context.getRoom());
    return;
  }

  private async processSetServersCommand(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
    const [, serverAddress] = context.getArguments();

    if (!serverAddress) {
      await msgHelper.sendNotification('Usage: `/ombi set-server [SERVER ADDRESS]`', read, modify, context.getSender(), context.getRoom());
      return;
    }

    const urlRegex = new RegExp('^(https?:\\/\\/)?' + // protocol
    '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
    '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
    '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
    '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
    '(\\#[-a-z\\d_]*)?$', 'i'); // fragment locator
    const isValidUrl = !!urlRegex.test(serverAddress);

    if (!isValidUrl) {
      await msgHelper.sendNotification('Usage: `/ombi set-server [SERVER ADDRESS]`', read, modify, context.getSender(), context.getRoom());
      return;
    }

    let server = serverAddress.trim();

    if (server.substring(server.length - 1) === '/') {
      server = server.substring(0, server.length - 1);
    }

    const persistence = new AppPersistence(persis, read.getPersistenceReader());

    await persistence.setUserServer(server, context.getSender());

    await msgHelper.sendNotificationSingleAttachment({
      collapsed: false,
      color: '#00CE00',
      title: {
        value: 'Successfully set server!',
        link: server,
      },
    }, read, modify, context.getSender(), context.getRoom());
  }

  private async processLoginCommand(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
    const [, username, password] = context.getArguments();

    if (!username || !password) {
      await msgHelper.sendNotification('Usage: `/ombi login [USERNAME] [PASSWORD]`', read, modify, context.getSender(), context.getRoom());
      return;
    }

    const persistence = new AppPersistence(persis, read.getPersistenceReader());

    const serverAddress = await persistence.getUserServer(context.getSender());

    if (!serverAddress) {
      await msgHelper.sendNotificationSingleAttachment({
        collapsed: false,
        color: '#e10000',
        title: {
          value: 'No server set!',
        },
        text: 'Please set a server address using the command `/ombi set-server [SERVER ADDRESS]`',
      }, read, modify, context.getSender(), context.getRoom());
      return;
    }

    const url = serverAddress + '/api/v1/Token';

    const loginResult = await http.post(url, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      data: {
        username, password, rememberMe: true, usePlexAdminAccount: false,
      },
    });

    if (loginResult && loginResult.content) {
      const content = JSON.parse(loginResult.content);
      const token = content.access_token;
      const expiration = content.expiration;

      if (!token || !expiration) {
        await msgHelper.sendNotificationSingleAttachment({
          collapsed: false,
          color: '#e10000',
          title: {
            value: 'Failed to set token!',
          },
          text: 'Please try again.',
        }, read, modify, context.getSender(), context.getRoom());
        return;
      }

      await persistence.setUserToken(token, context.getSender());

      await msgHelper.sendNotificationSingleAttachment({
        collapsed: false,
        color: '#00CE00',
        title: {
          value: 'Logged in!',
          link: serverAddress,
        },
        text: '*Token: *' + token + '\n*Expires * ' + expiration,
      }, read, modify, context.getSender(), context.getRoom());

    } else {
      await msgHelper.sendNotificationSingleAttachment({
        collapsed: false,
        color: '#e10000',
        title: {
          value: 'Failed to login!',
        },
        text: 'Please try again.',
      }, read, modify, context.getSender(), context.getRoom());
    }
  }

  private async processRequestsCommand(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
    const [, requestType, filter] = context.getArguments();

    if (!requestType) {
      // tslint:disable-next-line:max-line-length
      await msgHelper.sendNotification('Usage: `/ombi requests (movie|show|tv) (approved|unapproved|available|unavailable|denied)`', read, modify, context.getSender(), context.getRoom());
      return;
    }

    let filterScrubbed = '';
    if (filter)  {
      filterScrubbed = filter.toLowerCase().trim();
      // tslint:disable-next-line:max-line-length
      if (filterScrubbed !== 'approved' && filterScrubbed !== 'unapproved' && filterScrubbed !== 'available' && filterScrubbed !== 'unavailable' && filterScrubbed !== 'denied') {
        // tslint:disable-next-line:max-line-length
        await msgHelper.sendNotification('Didn\'t understand your filter!\nUsage: `/ombi requests (movie|show|tv) (approved|unapproved|available|unavailable|denied)`', read, modify, context.getSender(), context.getRoom());
        return;
      }
    }

    const persistence = new AppPersistence(persis, read.getPersistenceReader());

    const token = await persistence.getUserToken(context.getSender());

    if (!token) {
      await msgHelper.sendTokenExpired(read, modify, context.getSender(), context.getRoom());
      return;
    }

    const serverAddress = await persistence.getUserServer(context.getSender());
    let url = serverAddress + '/api/v1/Request/';
    const headers = {
      Authorization: 'Bearer ' + token,
      Accept: 'application/json',
    };

    const type = requestType.trim().toLowerCase();

    if (type === 'movie') {
      url += 'movie';
    } else if (type === 'show' || type === 'tv') {
      url += 'tv';
    } else {
      // tslint:disable-next-line:max-line-length
      await msgHelper.sendNotification('Usage: `/ombi requests (movie|show|tv) (approved|unapproved|available|unavailable|denied)`', read, modify, context.getSender(), context.getRoom());
      return;
    }

    const requestsResult = await http.get(url, {headers});

    if (!requestsResult) {
      await msgHelper.sendNotificationSingleAttachment({
        collapsed: false,
        color: '#e10000',
        title: {
          value: 'Failed to get requests!',
        },
        text: 'Please try again.',
      }, read, modify, context.getSender(), context.getRoom());
      return;
    }

    if (requestsResult.statusCode === 401) {
      await msgHelper.sendTokenExpired(read, modify, context.getSender(), context.getRoom());
      return;
    }

    if (requestsResult.content) {
      const content = JSON.parse(requestsResult.content);

      if (Array.isArray(content)) {
        let requests = new Array();
        if (filterScrubbed && filterScrubbed !== '') {
          content.forEach((request) => {
            if (filterScrubbed === 'approved') {
              if (request.approved === true) {
                requests.push(request);
              } else {
                let addRequest = false;
                if (request.childRequests && Array.isArray(request.childRequests) && request.childRequests.length === 1) {
                  const seasonsRequested = request.childRequests[0].seasonRequests;
                  if (seasonsRequested && Array.isArray(seasonsRequested) && seasonsRequested.length > 0) {
                    seasonsRequested.forEach((season) => {
                      if (season.episodes && Array.isArray(season.episodes) && season.episodes.length > 0) {
                        season.episodes.forEach((episode) => {
                          if (episode.approved === true) {
                            addRequest = true;
                          }
                        });
                      }
                    });
                  }
                }
                if (addRequest) {
                  requests.push(request);
                }
              }
            } else if (filterScrubbed === 'unapproved') {
              if (request.approved === false) {
                requests.push(request);
              } else {
                let addRequest = false;
                if (request.childRequests && Array.isArray(request.childRequests) && request.childRequests.length === 1) {
                  const seasonsRequested = request.childRequests[0].seasonRequests;
                  if (seasonsRequested && Array.isArray(seasonsRequested) && seasonsRequested.length > 0) {
                    seasonsRequested.forEach((season) => {
                      if (season.episodes && Array.isArray(season.episodes) && season.episodes.length > 0) {
                        season.episodes.forEach((episode) => {
                          if (episode.approved === false) {
                            addRequest = true;
                          }
                        });
                      }
                    });
                  }
                }
                if (addRequest) {
                  requests.push(request);
                }
              }
            } else if (filterScrubbed === 'available') {
              if (request.available === false) {
                requests.push(request);
              } else {
                let addRequest = false;
                if (request.childRequests && Array.isArray(request.childRequests) && request.childRequests.length === 1) {
                  const seasonsRequested = request.childRequests[0].seasonRequests;
                  if (seasonsRequested && Array.isArray(seasonsRequested) && seasonsRequested.length > 0) {
                    seasonsRequested.forEach((season) => {
                      if (season.episodes && Array.isArray(season.episodes) && season.episodes.length > 0) {
                        season.episodes.forEach((episode) => {
                          if (episode.available === true) {
                            addRequest = true;
                          }
                        });
                      }
                    });
                  }
                }
                if (addRequest) {
                  requests.push(request);
                }
              }
            } else if (filterScrubbed === 'unavailable') {
              if (request.available === false) {
                requests.push(request);
              } else {
                let addRequest = false;
                if (request.childRequests && Array.isArray(request.childRequests) && request.childRequests.length === 1) {
                  const seasonsRequested = request.childRequests[0].seasonRequests;
                  if (seasonsRequested && Array.isArray(seasonsRequested) && seasonsRequested.length > 0) {
                    seasonsRequested.forEach((season) => {
                      if (season.episodes && Array.isArray(season.episodes) && season.episodes.length > 0) {
                        season.episodes.forEach((episode) => {
                          if (episode.available === false) {
                            addRequest = true;
                          }
                        });
                      }
                    });
                  }
                }
                if (addRequest) {
                  requests.push(request);
                }
              }
            } else if (filterScrubbed === 'denied') {
              if (request.denied === true) {
                requests.push(request);
              } else {
                let addRequest = false;
                if (request.childRequests && Array.isArray(request.childRequests) && request.childRequests.length === 1) {
                  const seasonsRequested = request.childRequests[0].seasonRequests;
                  if (seasonsRequested && Array.isArray(seasonsRequested) && seasonsRequested.length > 0) {
                    seasonsRequested.forEach((season) => {
                      if (season.episodes && Array.isArray(season.episodes) && season.episodes.length > 0) {
                        season.episodes.forEach((episode) => {
                          if (episode.denied === true) {
                            addRequest = true;
                          }
                        });
                      }
                    });
                  }
                }
                if (addRequest) {
                  requests.push(request);
                }
              }
            }
          });
        } else {
          requests = content;
        }
        // Sort the requests by requested date desc (newest first)
        requests = requests.sort((a, b) => {
          if (a.requestedDate && b.requestedDate) {
            if (a.requestedDate < b.requestedDate) {
              return -1;
            }
            if (a.requestedDate > b.requestedDate) {
              return 1;
            }
          } else if (a.childRequests && Array.isArray(a.childRequests) && a.childRequests.length === 1 &&
            b.childRequests && Array.isArray(b.childRequests) && b.childRequests.length === 1) {
              const aChildRequests = a.childRequests[0];
              const bChildRequests = a.childRequests[0];
              if (aChildRequests.requestedDate && bChildRequests.requestedDate && aChildRequests < bChildRequests) {
                return -1;
              }
              if (aChildRequests.requestedDate && bChildRequests.requestedDate && aChildRequests > bChildRequests) {
                return 1;
              }
            }
          return 0;
        });
        requests = requests.reverse();

        const queryMessage = (filterScrubbed && filterScrubbed !== '') ?
          requestType + ' ' + filterScrubbed :
          requestType;

        await msgHelper.sendRequestMetadata(requests, serverAddress, read, modify, context.getSender(), context.getRoom(), queryMessage);
      }
    } else {
      await msgHelper.sendNotificationSingleAttachment({
        collapsed: false,
        color: '#e10000',
        title: {
          value: 'Failed to parse requests!',
        },
        text: 'Please try again.',
      }, read, modify, context.getSender(), context.getRoom());
      return;
    }
  }

  private async processSearchCommand(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
    const args = context.getArguments();
    if (args.length < 3) {
      await msgHelper.sendNotification('Usage: `/ombi search (movie|tv|show) [QUERY]`', read, modify, context.getSender(), context.getRoom());
    }
    const typeArg = args[1];
    let searchArg = '';
    // tslint:disable-next-line:prefer-for-of
    for (let x = 2; x < args.length; x++) {
      searchArg += args[x] + ' ';
    }
    searchArg = searchArg.trim();

    if (!typeArg || searchArg === '') {
      await msgHelper.sendNotification('Usage: `/ombi search (movie|tv|show) [QUERY]`', read, modify, context.getSender(), context.getRoom());
      return;
    }

    const persistence = new AppPersistence(persis, read.getPersistenceReader());

    const token = await persistence.getUserToken(context.getSender());

    if (!token) {
      await msgHelper.sendTokenExpired(read, modify, context.getSender(), context.getRoom());
      return;
    }

    const serverAddress = await persistence.getUserServer(context.getSender());
    let url = serverAddress + '/api/v1/Search/';
    const headers = {
      Authorization: 'Bearer ' + token,
      Accept: 'application/json',
    };

    if (typeArg === 'movie') {
      url += 'movie/' + searchArg;
    } else if (typeArg === 'tv' || typeArg === 'show') {
      url += 'tv/' + searchArg;
    } else {
      await msgHelper.sendNotification('Usage: `/ombi search (movie|tv|show) [QUERY]`', read, modify, context.getSender(), context.getRoom());
      return;
    }

    const searchResponse = await http.get(url, {headers});

    if (!searchResponse) {
      await msgHelper.sendNotificationSingleAttachment({
        collapsed: false,
        color: '#e10000',
        title: {
          value: 'Failed to get results!',
        },
        text: 'Please try again.',
      }, read, modify, context.getSender(), context.getRoom());
      return;
    }

    if (searchResponse.statusCode === 401) {
      await msgHelper.sendTokenExpired(read, modify, context.getSender(), context.getRoom());
      return;
    }

    const searchResponseContent = JSON.parse(searchResponse.content || '');

    if (searchResponseContent && Array.isArray(searchResponseContent)) {
      // tslint:disable-next-line:max-line-length
      await msgHelper.sendSearchMetadata(searchResponseContent, serverAddress, read, modify, context.getSender(), context.getRoom(), typeArg + ' ' + searchArg, typeArg);
    } else {
      await msgHelper.sendNotificationSingleAttachment({
        collapsed: false,
        color: '#e10000',
        title: {
          value: 'Failed to parse search results!',
        },
        text: 'Please try again.',
      }, read, modify, context.getSender(), context.getRoom());
      return;
    }
  }

  private async processRequestCommand(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
    const [, requestType, id, specifier] = context.getArguments();

    if (!requestType || !id) {
      // tslint:disable-next-line:max-line-length
      await msgHelper.sendNotification('Usage: `/ombi request (movie|show|tv) [ID] (first|latest|all)`\n(Get the Id from `/ombi search`)', read, modify, context.getSender(), context.getRoom());
      return;
    }

    const persistence = new AppPersistence(persis, read.getPersistenceReader());

    const token = await persistence.getUserToken(context.getSender());

    if (!token) {
      await msgHelper.sendTokenExpired(read, modify, context.getSender(), context.getRoom());
      return;
    }

    const serverAddress = await persistence.getUserServer(context.getSender());
    let url = serverAddress + '/api/v1/Request/';
    const headers = {
      Authorization: 'Bearer ' + token,
      Accept: 'application/json',
    };

    const type = requestType.trim().toLowerCase();

    let data = {};
    let typeForReturnMessage = type;

    if (type === 'movie') {
      typeForReturnMessage = 'Movie';
      url += 'movie';
      data = {
        theMovieDbId: id,
      };
    } else if (type === 'show' || type === 'tv') {
      typeForReturnMessage = 'TV Show';
      url += 'tv';

      if (specifier === 'first') {
        data = {
          id,
          firstSeason: true,
          latestSeason: false,
          requestAll: false,
        };
      } else if (specifier === 'latest') {
        data = {
          id,
          firstSeason: false,
          latestSeason: true,
          requestAll: false,
        };
      } else if (specifier === 'all') {
        data = {
          id,
          firstSeason: false,
          latestSeason: false,
          requestAll: true,
        };
      } else {
        // tslint:disable-next-line:max-line-length
        await msgHelper.sendNotification('Usage: `/ombi request (movie|show|tv) [ID] (first|latest|all)`', read, modify, context.getSender(), context.getRoom());
        return;
      }
    } else {
      // tslint:disable-next-line:max-line-length
      await msgHelper.sendNotification('Usage: `/ombi request (movie|show|tv) [ID] (first|latest|all)`', read, modify, context.getSender(), context.getRoom());
      return;
    }

    const requestResponse = await http.post(url, {
      headers,
      data,
    });

    if (!requestResponse) {
      await msgHelper.sendNotificationSingleAttachment({
        collapsed: false,
        color: '#e10000',
        title: {
          value: 'Failed to get response!',
        },
        text: 'Please try again.',
      }, read, modify, context.getSender(), context.getRoom());
      return;
    }

    if (requestResponse.statusCode === 401) {
      await msgHelper.sendTokenExpired(read, modify, context.getSender(), context.getRoom());
      return;
    }

    if (requestResponse.statusCode === 200 && requestResponse.content && requestResponse.content) {
      const jsonResult = JSON.parse(requestResponse.content);
      let message = (jsonResult && jsonResult.message) ? jsonResult.message : (typeForReturnMessage + ' ' + id + ' has been successfully requested!');
      let color = '#00CE00';
      if (jsonResult && jsonResult.errorMessage && jsonResult.isError) {
        message = jsonResult.errorMessage;
        color = '#e10000';
      }
      await msgHelper.sendNotificationSingleAttachment({
        collapsed: false,
        color,
        title: {
          value: message,
        },
      }, read, modify, context.getSender(), context.getRoom());
    } else {
      await msgHelper.sendNotificationSingleAttachment({
        collapsed: false,
        color: '#e10000',
        title: {
          value: 'Failed to parse response!',
        },
        text: 'Please try again.',
      }, read, modify, context.getSender(), context.getRoom());
    }
  }
}
