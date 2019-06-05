import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { ISlashCommand, SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';
import * as msgHelper from '../lib/helpers/messageHelper';
import { AppPersistence } from '../lib/persistence';
import { OmbiApp } from '../OmbiApp';

export class OmbiRequestsCommand implements ISlashCommand {
  public command = 'ombi-requests';
  public i18nParamsExample = 'slashcommand_requests_params';
  public i18nDescription = 'slashcommand_requests_description';
  public providesPreview = false;

  public constructor(private readonly app: OmbiApp) {}

  public async executor(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
    // const [requestType, filterOrQuery] = context.getArguments();

    const args = context.getArguments();
    if (args.length === 0) {
      await msgHelper.sendUsage(read, modify, context.getSender(), context.getRoom(), this.command, 'Invalid number of arguments!');
      return;
    }

    const requestType = args[0];

    if (!requestType) {
      await msgHelper.sendUsage(read, modify, context.getSender(), context.getRoom(), this.command, 'Invalid request type!');
      return;
    }

    let filterOrQuery = args.join(' ').replace(requestType, '').trim();

    // FILTERS
    let m;
    const filtersRegex = /filters=\((.*?)\)/gm;
    let filtersText = '';
    let filtersTextToRemove = '';
    const filters = new Array();

    // tslint:disable-next-line:no-conditional-assignment
    while ((m = filtersRegex.exec(filterOrQuery)) !== null) {
      // This is necessary to avoid infinite loops with zero-width matches
      if (m.index === filtersRegex.lastIndex) {
        filtersRegex.lastIndex++;
      }
      m.forEach((match, groupIndex) => {
        if (groupIndex === 0) {
          filtersTextToRemove = match;
        } else if (groupIndex === 1) {
          filtersText = match;
        }
      });
    }

    let filtersArr = new Array();
    if (filtersText && filtersText !== '' && filtersTextToRemove && filtersTextToRemove !== '') {
      // Set filters array
      filtersArr = filtersText.split(',');
      filtersArr.forEach(async (filterTemp) => {
        filterTemp = filterTemp.toLowerCase().trim();
        if (filterTemp !== 'released' && filterTemp !== 'approved' && filterTemp !== 'unapproved' &&
        filterTemp !== 'available' && filterTemp !== 'unavailable' && filterTemp !== 'denied') {
            await msgHelper.sendUsage(read, modify, context.getSender(), context.getRoom(), this.command, 'Didn\'t understand your filter!');
            return;
        }
      });
      // Update query
      filterOrQuery = filterOrQuery.replace(filtersTextToRemove, '').trim();
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
      await msgHelper.sendUsage(read, modify, context.getSender(), context.getRoom(), this.command, 'Invalid request type `' + type + '`!');
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
        let requests = content;
        filtersArr.forEach((filterItem) => {
          if (filterItem === 'released') {
            requests = requests.filter((request) => {
              const requestedDateString = request.releaseDate;
              if (requestedDateString) {
                const requestedDate = new Date(requestedDateString);
                if (requestedDate < new Date()) {
                  return true;
                } else {
                  return false;
                }
              } else {
                let hasEpisodes = false;
                if (request.childRequests && Array.isArray(request.childRequests) && request.childRequests.length === 1) {
                  let seasonsRequested = request.childRequests[0].seasonRequests;
                  if (seasonsRequested && Array.isArray(seasonsRequested) && seasonsRequested.length > 0) {
                    const seasons = new Array();
                    seasonsRequested.forEach((season) => {
                      if (season.episodes && Array.isArray(season.episodes) && season.episodes.length > 0) {
                        const episodes = new Array();
                        hasEpisodes = false;
                        season.episodes.forEach((episode) => {
                          const airedDateString = episode.airDate;
                          if (airedDateString) {
                            const airedDate = new Date(airedDateString);
                            if (airedDate < new Date()) {
                              episodes.push(episode);
                              hasEpisodes = true;
                            }
                          }
                        });
                        season.episodes = episodes;
                        if (hasEpisodes) {
                          seasons.push(season);
                        }
                      }
                    });
                    seasonsRequested = seasons;
                  }
                }
                return hasEpisodes;
              }
            });
          } else if (filterItem === 'approved') {
            requests = requests.filter((request) => {
              if (request.approved === true) {
                return true;
              } else {
                let hasEpisodes = false;
                if (request.childRequests && Array.isArray(request.childRequests) && request.childRequests.length === 1) {
                  let seasonsRequested = request.childRequests[0].seasonRequests;
                  if (seasonsRequested && Array.isArray(seasonsRequested) && seasonsRequested.length > 0) {
                    const seasons = new Array();
                    seasonsRequested.forEach((season) => {
                      if (season.episodes && Array.isArray(season.episodes) && season.episodes.length > 0) {
                        const episodes = new Array();
                        hasEpisodes = false;
                        season.episodes.forEach((episode) => {
                          if (episode.approved === true) {
                            episodes.push(episode);
                            hasEpisodes = true;
                          }
                        });
                        season.episodes = episodes;
                        if (hasEpisodes) {
                          seasons.push(season);
                        }
                      }
                    });
                    seasonsRequested = seasons;
                  }
                }
                return hasEpisodes;
              }
            });
          } else if (filterItem === 'unapproved') {
            requests = requests.filter((request) => {
              if (!request.approved || request.approved === false) {
                return true;
              } else {
                let hasEpisodes = false;
                if (request.childRequests && Array.isArray(request.childRequests) && request.childRequests.length === 1) {
                  let seasonsRequested = request.childRequests[0].seasonRequests;
                  if (seasonsRequested && Array.isArray(seasonsRequested) && seasonsRequested.length > 0) {
                    const seasons = new Array();
                    seasonsRequested.forEach((season) => {
                      if (season.episodes && Array.isArray(season.episodes) && season.episodes.length > 0) {
                        const episodes = new Array();
                        hasEpisodes = false;
                        season.episodes.forEach((episode) => {
                          if (episode.approved === false) {
                            episodes.push(episode);
                            hasEpisodes = true;
                          }
                        });
                        season.episodes = episodes;
                        if (hasEpisodes) {
                          seasons.push(season);
                        }
                      }
                    });
                    seasonsRequested = seasons;
                  }
                }
                return hasEpisodes;
              }
            });
          } else if (filterItem === 'available') {
            requests = requests.filter((request) => {
              if (request.available === false) {
                return true;
              } else {
                let hasEpisodes = false;
                if (request.childRequests && Array.isArray(request.childRequests) && request.childRequests.length === 1) {
                  let seasonsRequested = request.childRequests[0].seasonRequests;
                  if (seasonsRequested && Array.isArray(seasonsRequested) && seasonsRequested.length > 0) {
                    const seasons = new Array();
                    seasonsRequested.forEach((season) => {
                      if (season.episodes && Array.isArray(season.episodes) && season.episodes.length > 0) {
                        const episodes = new Array();
                        hasEpisodes = false;
                        season.episodes.forEach((episode) => {
                          if (episode.available === true) {
                            episodes.push(episode);
                            hasEpisodes = true;
                          }
                        });
                        season.episodes = episodes;
                        if (hasEpisodes) {
                          seasons.push(season);
                        }
                      }
                    });
                    seasonsRequested = seasons;
                  }
                }
                return hasEpisodes;
              }
            });
          } else if (filterItem === 'unavailable') {
            requests = requests.filter((request) => {
              if (!request.available || request.available === false) {
                return true;
              } else {
                let hasEpisodes = false;
                if (request.childRequests && Array.isArray(request.childRequests) && request.childRequests.length === 1) {
                  let seasonsRequested = request.childRequests[0].seasonRequests;
                  if (seasonsRequested && Array.isArray(seasonsRequested) && seasonsRequested.length > 0) {
                    const seasons = new Array();
                    seasonsRequested.forEach((season) => {
                      if (season.episodes && Array.isArray(season.episodes) && season.episodes.length > 0) {
                        const episodes = new Array();
                        hasEpisodes = false;
                        season.episodes.forEach((episode) => {
                          if (episode.available === false) {
                            episodes.push(episode);
                            hasEpisodes = true;
                          }
                        });
                        season.episodes = episodes;
                        if (hasEpisodes) {
                          seasons.push(season);
                        }
                      }
                    });
                    seasonsRequested = seasons;
                  }
                }
                return hasEpisodes;
              }
            });
          } else if (filterItem === 'denied') {
            requests = requests.filter((request) => {
              if (request.denied === true) {
                return true;
              } else {
                let hasEpisodes = false;
                if (request.childRequests && Array.isArray(request.childRequests) && request.childRequests.length === 1) {
                  let seasonsRequested = request.childRequests[0].seasonRequests;
                  if (seasonsRequested && Array.isArray(seasonsRequested) && seasonsRequested.length > 0) {
                    const seasons = new Array();
                    seasonsRequested.forEach((season) => {
                      if (season.episodes && Array.isArray(season.episodes) && season.episodes.length > 0) {
                        const episodes = new Array();
                        hasEpisodes = false;
                        season.episodes.forEach((episode) => {
                          if (episode.denied === true) {
                            episodes.push(episode);
                            hasEpisodes = true;
                          }
                        });
                        season.episodes = episodes;
                        if (hasEpisodes) {
                          seasons.push(season);
                        }
                      }
                    });
                    seasonsRequested = seasons;
                  }
                }
                return hasEpisodes;
              }
            });
          }
        });
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

        const query = filterOrQuery;

        if (query && query !== '') {
          requests = requests.filter((request) => {
            return request.title.toLowerCase().indexOf(query.toLowerCase().trim()) !== -1;
          });
        }

        const queryMessage = requestType + (filtersText ? (' ' + filtersText) : '') + (query ? (' ' + query) : '');

        await msgHelper.sendRequestMetadata(requests, serverAddress, requestType, read, modify, context.getSender(), context.getRoom(), queryMessage);
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
}
