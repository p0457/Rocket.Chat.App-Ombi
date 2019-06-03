import {
  IConfigurationExtend, IEnvironmentRead, ILogger,
} from '@rocket.chat/apps-engine/definition/accessors';
import { App } from '@rocket.chat/apps-engine/definition/App';
import { IAppInfo } from '@rocket.chat/apps-engine/definition/metadata';
import { SettingType } from '@rocket.chat/apps-engine/definition/settings';
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
import { OmbiSetServerCommand } from './commands/OmbiSetServerCommand';

export class OmbiApp extends App {
    constructor(info: IAppInfo, logger: ILogger) {
        super(info, logger);
    }

    protected async extendConfiguration(configuration: IConfigurationExtend, environmentRead: IEnvironmentRead): Promise<void> {
      await configuration.settings.provideSetting({
        id: 'ombi_name',
        type: SettingType.STRING,
        packageValue: 'Ombi',
        required: true,
        public: false,
        i18nLabel: 'customize_name',
        i18nDescription: 'customize_name_description',
      });

      await configuration.settings.provideSetting({
        id: 'ombi_icon',
        type: SettingType.STRING,
        packageValue: 'https://raw.githubusercontent.com/tgardner851/Rocket.Chat.App-Ombi/master/icon.png',
        required: true,
        public: false,
        i18nLabel: 'customize_icon',
        i18nDescription: 'customize_icon_description',
      });

      await configuration.slashCommands.provideSlashCommand(new OmbiCommand(this));
      await configuration.slashCommands.provideSlashCommand(new OmbiSetServerCommand(this));
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
