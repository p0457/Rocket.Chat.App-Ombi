import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { IRoom } from '@rocket.chat/apps-engine/definition/rooms';
import { ISlashCommand, SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';
import { IUser } from '@rocket.chat/apps-engine/definition/users';
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
    const [requestType, filter] = context.getArguments();

    if (!requestType) {
      await this.sendUsage(read, modify, context.getSender(), context.getRoom(), 'Invalid request type!');
      return;
    }

    let filterScrubbed = '';
    if (filter)  {
      filterScrubbed = filter.toLowerCase().trim();
      // tslint:disable-next-line:max-line-length
      if (filterScrubbed !== 'approved' && filterScrubbed !== 'unapproved' && filterScrubbed !== 'available' && filterScrubbed !== 'unavailable' && filterScrubbed !== 'denied') {
        await this.sendUsage(read, modify, context.getSender(), context.getRoom(), 'Didn\'t understand your filter `' + filterScrubbed + '`!');
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
      await this.sendUsage(read, modify, context.getSender(), context.getRoom(), 'Invalid request type `' + type + '`!');
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

  private async sendUsage(read: IRead, modify: IModify, user: IUser, room: IRoom, additionalText?) {
    // tslint:disable-next-line:max-line-length
    await msgHelper.sendNotification(additionalText ? additionalText + '\n' : '' + 'Usage: `/ombi-requests [movie|tv|show] (approved|unapproved|available|unavailable|denied)`', read, modify, user, room);
    return;
  }
}
