import { IPersistence, IPersistenceRead } from '@rocket.chat/apps-engine/definition/accessors';
import { RocketChatAssociationModel, RocketChatAssociationRecord } from '@rocket.chat/apps-engine/definition/metadata';
import { IUser } from '@rocket.chat/apps-engine/definition/users';

export class AppPersistence {
  constructor(private readonly persistence: IPersistence, private readonly persistenceRead: IPersistenceRead) {}

  public async setUserServer(server: string, user: IUser): Promise<void> {
    const userAssociation = new RocketChatAssociationRecord(RocketChatAssociationModel.USER, user.id);
    const typeAssociation = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, 'ombi-server');

    await this.persistence.updateByAssociations([userAssociation, typeAssociation], { server }, true);
  }

  public async getUserServer(user: IUser): Promise<string | undefined> {
    const userAssociation = new RocketChatAssociationRecord(RocketChatAssociationModel.USER, user.id);
    const typeAssociation = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, 'ombi-server');

    const [result] = await this.persistenceRead.readByAssociations([userAssociation, typeAssociation]);

    return result ? (result as any).server : undefined;
  }
  public async setUserToken(token: string, user: IUser): Promise<void> {
    const userAssociation = new RocketChatAssociationRecord(RocketChatAssociationModel.USER, user.id);
    const typeAssociation = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, 'ombi-token');

    await this.persistence.updateByAssociations([userAssociation, typeAssociation], { token }, true);
  }

  public async getUserToken(user: IUser): Promise<string | undefined> {
    const userAssociation = new RocketChatAssociationRecord(RocketChatAssociationModel.USER, user.id);
    const typeAssociation = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, 'ombi-token');

    const [result] = await this.persistenceRead.readByAssociations([userAssociation, typeAssociation]);

    return result ? (result as any).token : undefined;
  }
}
