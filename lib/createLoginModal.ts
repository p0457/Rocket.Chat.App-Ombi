import { IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { RocketChatAssociationModel, RocketChatAssociationRecord } from '@rocket.chat/apps-engine/definition/metadata';
import { IUIKitModalViewParam } from '@rocket.chat/apps-engine/definition/uikit/UIKitInteractionResponder';
import { AppPersistence } from './persistence';

import { uuid } from './helpers/uuid';

export async function createLoginModal({ id = '', persis, data, read, modify, serverUrl }: {
    id?: string,
    persis: IPersistence,
    data,
    read: IRead, 
    modify: IModify,
    serverUrl?: string
}): Promise<IUIKitModalViewParam> {
    const viewId = id || uuid();

    const association = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, viewId);
    await persis.createWithAssociation({ room: data.room }, association);

    if (!serverUrl || serverUrl.trim() === '') {
        const persistence = new AppPersistence(persis, read.getPersistenceReader());
        serverUrl = await persistence.getUserServerById(data.userId);
    }

    const block = modify.getCreator().getBlockBuilder();
    block.addInputBlock({
        blockId: 'ombiserver',
        element: block.newPlainTextInputElement({ 
            initialValue: serverUrl,
            actionId: 'server',
            placeholder: block.newPlainTextObject('https://your_ombi_server')
        }),
        label: block.newPlainTextObject('Server URL'),
    });
    block.addInputBlock({
        blockId: 'ombilogin',
        element: block.newPlainTextInputElement({ 
            actionId: 'username',
            placeholder: block.newPlainTextObject('Username')
        }),
        label: block.newPlainTextObject('Ombi Username'),
    });
    block.addInputBlock({
        blockId: 'ombipassword',
        element: block.newPlainTextInputElement({ 
            actionId: 'password',
            placeholder: block.newPlainTextObject('Password')
        }),
        label: block.newPlainTextObject('Ombi Password'),
    });

    return {
        id: viewId,
        title: block.newPlainTextObject('Login to Ombi'),
        submit: block.newButtonElement({
            text: block.newPlainTextObject('Login'),
        }),
        close: block.newButtonElement({
            text: block.newPlainTextObject('Dismiss'),
        }),
        blocks: block.getBlocks(),
    };
}
