import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { ISlashCommand, SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';
import * as msgHelper from '../lib/helpers/messageHelper';
import { AppPersistence } from '../lib/persistence';
import { OmbiApp } from '../OmbiApp';

export class OmbiRequestCommand implements ISlashCommand {
  public command = 'ombi-request';
  public i18nParamsExample = 'slashcommand_request_params';
  public i18nDescription = 'slashcommand_request_description';
  public providesPreview = false;

  public constructor(private readonly app: OmbiApp) {}

  public async executor(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
    const [requestType, id, specifier] = context.getArguments();

    if (!requestType || !id) {
      await msgHelper.sendUsage(read, modify, context.getSender(), context.getRoom(), this.command, 'Type or Id was missing!');
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
        await msgHelper.sendUsage(read, modify, context.getSender(), context.getRoom(), this.command, 'Specifier for series was invalid `' + type + '`!');
        return;
      }
    } else {
      await msgHelper.sendUsage(read, modify, context.getSender(), context.getRoom(), this.command, 'Type was invalid `' + type + '`!');
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

      // Notify a user of request
      // TODO: verify working
      const requestNotifier = await read.getEnvironmentReader().getSettings().getValueById('ombi_postto_newrequestnotification');
      if (requestNotifier && requestNotifier !== '@' + context.getSender().username) {
        let room;
        if (requestNotifier.startsWith('@')) {
          room = await read.getRoomReader().getDirectByUsernames(['rocket.cat', requestNotifier.substring(1, requestNotifier.length)]);
        } else if (requestNotifier.startsWith('#')) {
          room = await read.getRoomReader().getByName(requestNotifier.substring(1, requestNotifier.length));
        }

        if (!room) {
          return;
        }

        let requestsUrl = serverAddress + '/api/v1/Request/';
        if (type === 'movie') {
          requestsUrl += 'movie';
        } else if (type === 'show' || type === 'tv') {
          requestsUrl += 'tv';
        }

        const requestsResult = await http.get(requestsUrl, {headers});

        if (requestsResult.content) {
          const content = JSON.parse(requestsResult.content);
          if (Array.isArray(content)) {
            let requests = content;
            requests = requests.filter((request) => {
              if (type === 'movie') {
                return request.theMovieDbId === id;
              } else if (type === 'show' || type === 'tv') {
                return (request.id || request.tvDbId) === id;
              } else {
                return false;
              }
            });
            if (requests && requests.length === 1) {
              const sender = await read.getUserReader().getById('rocket.cat');
              await msgHelper.sendRequestMetadata(requests, serverAddress, type, read, modify, sender, room, 'notifier-setting');
            }
          }
        }
      }
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
