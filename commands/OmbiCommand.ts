import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { IMessageAttachmentField } from '@rocket.chat/apps-engine/definition/messages';
import { ISlashCommand, SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';
import * as msgHelper from '../lib/helpers/messageHelper';
import usage from '../lib/helpers/usage';
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

    let text = '';

    for (const p in usage) {
      if (usage.hasOwnProperty(p)) {
        if (usage[p].command && usage[p].usage && usage[p].description) {
          text += usage[p].usage + '\n>' + usage[p].description + '\n';
        }
      }
    }

    text += '\nFirst, set your server with `/ombi-set-server`. Then, login using `/ombi-login`.\n'
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
