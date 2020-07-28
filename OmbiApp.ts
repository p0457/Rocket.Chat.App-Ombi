import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import {
  IConfigurationExtend, IEnvironmentRead, ILogger,
} from '@rocket.chat/apps-engine/definition/accessors';
import {
    IUIKitInteractionHandler,
    UIKitBlockInteractionContext,
    UIKitViewSubmitInteractionContext,
} from '@rocket.chat/apps-engine/definition/uikit';
import { App } from '@rocket.chat/apps-engine/definition/App';
import { IAppInfo } from '@rocket.chat/apps-engine/definition/metadata';
import { SettingType } from '@rocket.chat/apps-engine/definition/settings';
import { login } from './lib/helpers/login';
import { OmbiApproveCommand } from './commands/OmbiApproveCommand';
import { OmbiCommand } from './commands/OmbiCommand';
import { OmbiDeleteCommand } from './commands/OmbiDeleteCommand';
import { OmbiDenyCommand } from './commands/OmbiDenyCommand';
import { OmbiLoginCommand } from './commands/OmbiLoginCommand';
import { OmbiMarkAvailableCommand } from './commands/OmbiMarkAvailableCommand';
import { OmbiMarkUnavailableCommand } from './commands/OmbiMarkUnavailableCommand';
import { OmbiRequestCommand } from './commands/OmbiRequestCommand';
import { OmbiRequestsCommand } from './commands/OmbiRequestsCommand';
import { OmbiSearchCommand } from './commands/OmbiSearchCommand';

export class OmbiApp extends App implements IUIKitInteractionHandler {
    constructor(info: IAppInfo, logger: ILogger) {
        super(info, logger);
    }

    public async executeViewSubmitHandler(context: UIKitViewSubmitInteractionContext, read: IRead, http: IHttp, persistence: IPersistence, modify: IModify) {
      const data = context.getInteractionData();

      const { state }: {
        state: {
          ombiserer: {
            server: string,
          },
          ombilogin: {
            username: string,
          },
          ombipassword: {
            password: string,
          },
        },
      } = data.view as any;

      if (!state) {
        return context.getInteractionResponder().viewErrorResponse({
          viewId: data.view.id,
          errors: {
            question: 'Error logging in',
          },
        });
      }

      try {
        await login(data, read, modify, http, persistence, data.user.id);
      } catch (err) {
        return context.getInteractionResponder().viewErrorResponse({
          viewId: data.view.id,
          errors: err,
        });
      }

      return {
        success: true,
      };
    }

    protected async extendConfiguration(configuration: IConfigurationExtend, environmentRead: IEnvironmentRead): Promise<void> {
      await configuration.settings.provideSetting({
        id: 'sender',
        type: SettingType.STRING,
        packageValue: 'ombi.bot',
        required: true,
        public: false,
        i18nLabel: 'customize_sender',
        i18nDescription: 'customize_sender_description',
      });

      await configuration.settings.provideSetting({
        id: 'name',
        type: SettingType.STRING,
        packageValue: 'Ombi',
        required: true,
        public: false,
        i18nLabel: 'customize_name',
        i18nDescription: 'customize_name_description',
      });

      await configuration.settings.provideSetting({
        id: 'icon',
        type: SettingType.STRING,
        packageValue: 'https://raw.githubusercontent.com/tgardner851/Rocket.Chat.App-Ombi/master/icon.png',
        required: true,
        public: false,
        i18nLabel: 'customize_icon',
        i18nDescription: 'customize_icon_description',
      });

      await configuration.settings.provideSetting({
        id: 'postto_newrequestnotification',
        type: SettingType.STRING,
        packageValue: '',
        required: true,
        public: false,
        i18nLabel: 'customize_postto_newrequestnotification',
        i18nDescription: 'customize_postto_newrequestnotification_description',
      });

      await configuration.slashCommands.provideSlashCommand(new OmbiCommand(this));
      await configuration.slashCommands.provideSlashCommand(new OmbiLoginCommand(this));
      await configuration.slashCommands.provideSlashCommand(new OmbiRequestsCommand(this));
      await configuration.slashCommands.provideSlashCommand(new OmbiSearchCommand(this));
      await configuration.slashCommands.provideSlashCommand(new OmbiRequestCommand(this));
      await configuration.slashCommands.provideSlashCommand(new OmbiApproveCommand(this));
      await configuration.slashCommands.provideSlashCommand(new OmbiDenyCommand(this));
      await configuration.slashCommands.provideSlashCommand(new OmbiMarkAvailableCommand(this));
      await configuration.slashCommands.provideSlashCommand(new OmbiMarkUnavailableCommand(this));
      await configuration.slashCommands.provideSlashCommand(new OmbiDeleteCommand(this));
    }
}
