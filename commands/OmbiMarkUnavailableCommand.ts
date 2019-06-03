import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { ISlashCommand, SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';
import * as msgHelper from '../lib/helpers/messageHelper';
import { AppPersistence } from '../lib/persistence';
import { OmbiApp } from '../OmbiApp';

export class OmbiMarkUnavailableCommand implements ISlashCommand {
  public command = 'ombi-markunavailable';
  public i18nParamsExample = 'slashcommand_markunavailable_params';
  public i18nDescription = 'slashcommand_markunavailable_description';
  public providesPreview = false;

  public constructor(private readonly app: OmbiApp) {}

  public async executor(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
    const [requestType, id] = context.getArguments();

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
      'Authorization': 'Bearer ' + token,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };

    const type = requestType.trim().toLowerCase();

    const data = {
      id,
    };
    let typeForReturnMessage = type;

    if (type === 'movie') {
      typeForReturnMessage = 'Movie';
      url += 'movie';
    } else if (type === 'show' || type === 'tv') {
      typeForReturnMessage = 'TV Show';
      url += 'tv';
    } else {
      await msgHelper.sendUsage(read, modify, context.getSender(), context.getRoom(), this.command, 'Type was invalid `' + type + '`!');
      return;
    }
    url += '/unavailable';

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
      // tslint:disable-next-line:max-line-length
      let message = (jsonResult && jsonResult.message) ? jsonResult.message : (typeForReturnMessage + ' ' + id + ' has been successfully marked as unavailable!');
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
