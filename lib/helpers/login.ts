import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { IRoom } from '@rocket.chat/apps-engine/definition/rooms';
import { IUser } from '@rocket.chat/apps-engine/definition/users';
import { RocketChatAssociationModel, RocketChatAssociationRecord } from '@rocket.chat/apps-engine/definition/metadata';
import { MessageActionType, MessageProcessingType } from '@rocket.chat/apps-engine/definition/messages';
import {
    IUIKitViewSubmitIncomingInteraction,
} from '@rocket.chat/apps-engine/definition/uikit/UIKitIncomingInteractionTypes';
import { AppPersistence } from '../persistence';
import * as msgHelper from './messageHelper';

export async function login(data: IUIKitViewSubmitIncomingInteraction, read: IRead, modify: IModify, http: IHttp, persis: IPersistence, uid: string): Promise<void> {
  const { view: { id } } = data;
  const { state }: {
    state?: any;
  } = data.view;

  const association = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, id);
  const [record] = await read.getPersistenceReader().readByAssociation(association) as Array<{
    room: IRoom;
  }>;
  const user: IUser = await read.getUserReader().getById(uid);
  const room: IRoom = record.room;

  const serverAddress = state.ombiserver.server;

  const urlRegex = new RegExp('^(https?:\\/\\/)?' + // protocol
    '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
    '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
    '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
    '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
    '(\\#[-a-z\\d_]*)?$', 'i'); // fragment locator
  const isValidUrl = !!urlRegex.test(serverAddress);

  let server = serverAddress.trim();

  if (server.substring(server.length - 1) === '/') {
    server = server.substring(0, server.length - 1);
  }

  const persistence = new AppPersistence(persis, read.getPersistenceReader());

  await persistence.setUserServer(server, user);

  if (!isValidUrl) {
    await msgHelper.sendNotificationSingleAttachment({
      collapsed: false,
      color: '#e10000',
      title: {
        value: 'Server URL not valid!',
      },
      text: 'Please try again.',
    }, read, modify, user, room);
    return;
  }

  const username = state.ombilogin.username;
  const password = state.ombipassword.password;

  if (!username || !password) {
    await msgHelper.sendNotificationSingleAttachment({
      collapsed: false,
      color: '#e10000',
      title: {
        value: 'Credentials not valid!',
      },
      text: 'Please try again.',
    }, read, modify, user, room);
    return;
  }

  const url = `${serverAddress}/api/v1/Token`;

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
      }, read, modify, user, room);
      return;
    }

    await persistence.setUserToken(token, user);

    await msgHelper.sendNotificationSingleAttachment({
      collapsed: false,
      color: '#00CE00',
      title: {
        value: `Logged in to Ombi Server '${server}'!`,
        link: serverAddress,
      },
      text: '*Token: *' + token + '\n*Expires * ' + expiration,
      actions: [
        {
          type: MessageActionType.BUTTON,
          text: 'Search for Movie',
          msg: '/ombi-search movie QUERY',
          msg_in_chat_window: true,
          msg_processing_type: MessageProcessingType.RespondWithMessage
        },
        {
          type: MessageActionType.BUTTON,
          text: 'Search for Show',
          msg: '/ombi-search show QUERY',
          msg_in_chat_window: true,
          msg_processing_type: MessageProcessingType.RespondWithMessage
        },
        {
          type: MessageActionType.BUTTON,
          text: 'View Movie Requests',
          msg: '/ombi-requests movie filters=(unavailable)',
          msg_in_chat_window: true,
          msg_processing_type: MessageProcessingType.RespondWithMessage
        },
        {
          type: MessageActionType.BUTTON,
          text: 'View Show Requests',
          msg: '/ombi-requests show filters=(unavailable)',
          msg_in_chat_window: true,
          msg_processing_type: MessageProcessingType.RespondWithMessage
        }
      ]
    }, read, modify, user, room);

  } else {
    await msgHelper.sendNotificationSingleAttachment({
      collapsed: false,
      color: '#e10000',
      title: {
        value: 'Failed to login!',
      },
      text: 'Please try again.',
    }, read, modify, user, room);
  }
}