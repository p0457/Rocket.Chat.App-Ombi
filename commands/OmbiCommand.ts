import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { IMessageAttachmentField } from '@rocket.chat/apps-engine/definition/messages';
import { ISlashCommand, SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';
import * as msgHelper from '../lib/helpers/messageHelper';
import { AppPersistence } from '../lib/persistence';
import { OmbiApp } from '../OmbiApp';

export class OmbiCommand implements ISlashCommand {
  public command = 'ombi';
  public i18nParamsExample = 'slashcommand_params';
  public i18nDescription = 'slashcommand_description';
  public providesPreview = false;

  public constructor(private readonly app: OmbiApp) {}

  public async executor(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
    const persistence = new AppPersistence(persis, read.getPersistenceReader());

    const fields = new Array<IMessageAttachmentField>();

    const server = await persistence.getUserServer(context.getSender());
    if (server) {
      fields.push({
        short: true,
        title: 'Server',
        value: server,
      });
    }

    const text = '`/ombi`\n>Show this help menu\n'
    + '`/ombi-set-server [SERVER ADDRESS]`\n>Set the Ombi Server Address\n'
    + '`/ombi-login [USERNAME] [PASSWORD]`\n>Login to Ombi\n'
    // tslint:disable-next-line:max-line-length
    + '`/ombi-requests [movie|tv|show] (approved|unapproved|available|unavailable|denied)`\n>Show all requests for Movies or Series, optionally filter by approved/available/denied\n'
    + '`/ombi-search [movie|tv|show] [QUERY]`\n>Search Ombi for Movies or Series\n'
    // tslint:disable-next-line:max-line-length
    + '`/ombi-request [movie|tv|show] [ID] (first|latest|all)`\n>Request a movie using type and id (get id using `/ombi-search`); If series, specify first, latest, or all season(s)'
    + '\n\nFirst, set your server with `/ombi-set-server`. Then, login using `/ombi-login`.\n'
    + 'View your requests with `/ombi-requests`, or make a new request by searching using `/ombi-search`, getting '
    + 'the id, and using that to generate the request using `/ombi-request`.';

    await msgHelper.sendNotificationSingleAttachment({
      collapsed: false,
      color: '#e37200',
      title: {
        value: 'Commands',
      },
      text,
      fields,
    }, read, modify, context.getSender(), context.getRoom());
    return;
  }
}
