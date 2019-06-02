import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { IRoom } from '@rocket.chat/apps-engine/definition/rooms';
import { ISlashCommand, SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';
import { IUser } from '@rocket.chat/apps-engine/definition/users';
import * as msgHelper from '../lib/helpers/messageHelper';
import { AppPersistence } from '../lib/persistence';
import { OmbiApp } from '../OmbiApp';

export class OmbiSearchCommand implements ISlashCommand {
  public command = 'ombi-search';
  public i18nParamsExample = 'slashcommand_search_params';
  public i18nDescription = 'slashcommand_search_description';
  public providesPreview = false;

  public constructor(private readonly app: OmbiApp) {}

  public async executor(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
    const args = context.getArguments();
    if (args.length < 2) {
      await this.sendUsage(read, modify, context.getSender(), context.getRoom(), 'Didn\'t have enough arguments!');
      return;
    }
    const typeArg = args[0];
    let searchArg = '';
    // tslint:disable-next-line:prefer-for-of
    for (let x = 1; x < args.length; x++) {
      searchArg += args[x] + ' ';
    }
    searchArg = searchArg.trim();

    if (!typeArg || searchArg === '') {
      await this.sendUsage(read, modify, context.getSender(), context.getRoom(), 'Type not included or search argument invalid!');
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
      await this.sendUsage(read, modify, context.getSender(), context.getRoom(), 'Type was invalid `' + typeArg + '`!');
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

  private async sendUsage(read: IRead, modify: IModify, user: IUser, room: IRoom, additionalText?) {
    // tslint:disable-next-line:max-line-length
    await msgHelper.sendNotification(additionalText ? additionalText + '\n' : '' + 'Usage: `/ombi-search [movie|tv|show] [QUERY]`', read, modify, user, room);
    return;
  }
}
