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
        + '`/ombi requests (movie|tv|show)`\n>Show all requests for Movies or Series',
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
    const [, requestType] = context.getArguments();

    if (!requestType) {
      await msgHelper.sendNotification('Usage: `/ombi requests (movie|show|tv)`', read, modify, context.getSender(), context.getRoom());
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

    if (type === 'movie') {
      url += 'movie';
    } else if (type === 'show' || type === 'tv') {
      url += 'tv';
    } else {
      await msgHelper.sendNotification('Usage: `/ombi requests (movie|show|tv)`', read, modify, context.getSender(), context.getRoom());
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
        console.log('****2', content.length);
        await msgHelper.sendRequestMetadata(content, serverAddress, read, modify, context.getSender(), context.getRoom());
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
