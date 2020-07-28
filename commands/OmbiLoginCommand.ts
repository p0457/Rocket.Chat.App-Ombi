import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { ISlashCommand, SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';
import * as msgHelper from '../lib/helpers/messageHelper';
import { AppPersistence } from '../lib/persistence';
import { OmbiApp } from '../OmbiApp';
import { createLoginModal } from '../lib/createLoginModal';

export class OmbiLoginCommand implements ISlashCommand {
  public command = 'ombi-login';
  public i18nParamsExample = 'slashcommand_login_params';
  public i18nDescription = 'slashcommand_login_description';
  public providesPreview = false;

  public constructor(private readonly app: OmbiApp) {}

  public async executor(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
    const [serverUrl] = context.getArguments();
    const triggerId = context.getTriggerId();
    const userId = context.getSender().id;

    if (triggerId) {
      const modal = await createLoginModal({ persis, read, modify, data: { userId, room: (context.getRoom() as any).value }, serverUrl });
      await modify.getUiController().openModalView(modal, { triggerId }, context.getSender());
    }
  }
}
