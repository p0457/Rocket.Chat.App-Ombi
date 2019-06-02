import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { ISlashCommand, SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';
import * as msgHelper from '../lib/helpers/messageHelper';
import { AppPersistence } from '../lib/persistence';
import { OmbiApp } from '../OmbiApp';

export class OmbiLoginCommand implements ISlashCommand {
  public command = 'ombi-login';
  public i18nParamsExample = 'slashcommand_login_params';
  public i18nDescription = 'slashcommand_login_description';
  public providesPreview = false;

  public constructor(private readonly app: OmbiApp) {}

  public async executor(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
    const [username, password] = context.getArguments();

    if (!username || !password) {
      await msgHelper.sendUsage(read, modify, context.getSender(), context.getRoom(), this.command, 'Username and/or password was invalid!');
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
}
