import { IModify, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { IMessageAction, IMessageAttachment, MessageActionType, MessageProcessingType } from '@rocket.chat/apps-engine/definition/messages';
import { IRoom } from '@rocket.chat/apps-engine/definition/rooms';
import { IUser } from '@rocket.chat/apps-engine/definition/users';

export async function sendNotification(text: string, read: IRead, modify: IModify, user: IUser, room: IRoom): Promise<void> {
  const icon = await read.getEnvironmentReader().getSettings().getValueById('ombi_icon');
  const username = await read.getEnvironmentReader().getSettings().getValueById('ombi_name');
  const sender = await read.getUserReader().getById('rocket.cat');

  modify.getNotifier().notifyUser(user, modify.getCreator().startMessage({
      sender,
      room,
      text,
      groupable: false,
      alias: username,
      avatarUrl: icon,
  }).getMessage());
}

export async function sendNotificationSingleAttachment(attachment: IMessageAttachment, read: IRead, modify: IModify, user: IUser, room: IRoom): Promise<void> {
  const icon = await read.getEnvironmentReader().getSettings().getValueById('ombi_icon');
  const username = await read.getEnvironmentReader().getSettings().getValueById('ombi_name');
  const sender = await read.getUserReader().getById('rocket.cat');

  modify.getNotifier().notifyUser(user, modify.getCreator().startMessage({
      sender,
      room,
      groupable: false,
      alias: username,
      avatarUrl: icon,
      attachments: [attachment],
  }).getMessage());
}

export async function sendNotificationMultipleAttachments(attachments: Array<IMessageAttachment>, read: IRead, modify: IModify, user: IUser, room: IRoom): Promise<void> {
  const icon = await read.getEnvironmentReader().getSettings().getValueById('ombi_icon');
  const username = await read.getEnvironmentReader().getSettings().getValueById('ombi_name');
  const sender = await read.getUserReader().getById('rocket.cat');

  modify.getNotifier().notifyUser(user, modify.getCreator().startMessage({
      sender,
      room,
      groupable: false,
      alias: username,
      avatarUrl: icon,
      attachments,
  }).getMessage());
}

export async function sendTokenExpired(read: IRead, modify: IModify, user: IUser, room: IRoom): Promise<void> {
  await sendNotificationSingleAttachment({
    collapsed: false,
    color: '#e10000',
    title: {
      value: 'Token Expired!',
    },
    text: 'Please login again using `/ombi login [USERNAME] [PASSWORD]`',
  }, read, modify, user, room);
}

export async function sendRequestMetadata(requests, serverAddress, read: IRead, modify: IModify, user: IUser, room: IRoom, query?: string): Promise<void> {
  const attachments = new Array<IMessageAttachment>();
  // Initial attachment for results count
  attachments.push({
    collapsed: false,
    color: '#00CE00',
    title: {
      value: 'Results (' + requests.length + ')',
    },
    text: query ? 'Query: `' + query + '`' : '' ,
  });

  // tslint:disable-next-line:prefer-for-of
  for (let x = 0; x < requests.length; x++) {
    const request = requests[x];

    let text = '';

    const fields = new Array();

    let canApprove = false;
    if (request.canApprove !== undefined) {
      canApprove = request.canApprove;
    }

    fields.push({
      short: true,
      title: 'Id',
      value: request.id,
    });
    if (request.requestedDate && request.requestedUser && request.requestedUser.userAlias) {
      fields.push({
        short: true,
        title: 'Requested',
        value: request.requestedDate + '\n' + request.requestedUser.userAlias,
      });
    }
    if (request.status) {
      fields.push({
        short: true,
        title: 'Release Status',
        value: request.status,
      });
    }
    if (request.releaseDate) {
      fields.push({
        short: true,
        title: 'Released on',
        value: request.releaseDate,
      });
    }
    if (request.digitalRelease !== undefined) {
      fields.push({
        short: true,
        title: 'Digital Release?',
        value: request.digitalRelease,
      });
    }
    if (request.approved !== undefined) {
      fields.push({
        short: true,
        title: 'Approved by Admin?',
        value: request.approved,
      });
    } else {
      if (request.childRequests && Array.isArray(request.childRequests) && request.childRequests.length === 1) {
        if (request.childRequests[0].approved !== undefined) {
          fields.push({
            short: true,
            title: 'Approved by Admin?',
            value: request.childRequests[0].approved,
          });
        }
      }
    }
    if (request.available !== undefined) {
      fields.push({
        short: true,
        title: 'Available on Server?',
        value: request.available,
      });
    }

    if (request.imdbId) {
      text += '*IMDB: *https://www.imdb.com/title/' + request.imdbId + '\n';
    }
    if (request.theMovieDbId) {
      text += '*TheMovieDB: *https://www.themoviedb.org/movie/' + request.theMovieDbId + '\n';
    }
    if (request.tvDbId) {
      text += '*TheTVDB: *https://www.thetvdb.com/dereferrer/series/' + request.tvDbId + '\n';
    }
    if (request.totalSeasons && request.totalSeasons > 0) {
      text += '*Total Seasons: *' + request.totalSeasons + '\n';
    }
    if (request.childRequests && Array.isArray(request.childRequests) && request.childRequests.length === 1) {
      if (request.childRequests[0].canApprove !== undefined) {
        canApprove = request.childRequests[0].canApprove;
      }
      if (request.childRequests[0].requestedDate && request.childRequests[0].requestedUser && request.childRequests[0].requestedUser.userAlias) {
        fields.push({
          short: true,
          title: 'Requested',
          value: request.childRequests[0].requestedDate + '\n' + request.childRequests[0].requestedUser.userAlias,
        });
      }
      const seasonsRequested = request.childRequests[0].seasonRequests;
      if (seasonsRequested && Array.isArray(seasonsRequested) && seasonsRequested.length > 0) {
        text += '*[Episodes Requested]*\n';
        seasonsRequested.forEach((season) => {
          text += '::::*Season ' + season.seasonNumber + ':*\n';
          if (season.episodes && Array.isArray(season.episodes) && season.episodes.length > 0) {
            season.episodes.forEach((episode) => {
              text += '------*Episode ' + episode.episodeNumber + ' - ' + episode.title + '*\n';
              text += '__________*Link: *' + episode.url + '\n';
              text += '__________*Approved? *' + episode.approved + '\n';
              text += '__________*Available?: *' + episode.available + '\n';
              text += '__________*Season Id: *' + episode.seasonId + '\n';
              text += '__________*Id: *' + episode.id + '\n';
            });
          }
        });
      }
    }
    if (request.overview) {
      text += '\n*Overview: *' + request.overview;
    }

    // Wanted to do actions for approve/mark available, but can't pass tokens or headers, just urls...
    // TODO: Revisit when the API has matured and allows for complex HTTP requests with Bearer * headers.
    const actions = new Array<IMessageAction>();

    attachments.push({
      collapsed: true,
      color: '#e37200',
      title: {
        value: request.title,
        link: serverAddress,
      },
      fields,
      actions,
      text,
    });
  }

  await sendNotificationMultipleAttachments(attachments, read, modify, user, room);
}

export async function sendSearchMetadata(results, serverAddress, read: IRead, modify: IModify, user: IUser, room: IRoom, query?: string, type?: string): Promise<void> {
  const tempResults = new Array();
  results.forEach((result) => {
    if (result.id && result.id > 0) {
      tempResults.push(result);
    }
  });

  const attachments = new Array<IMessageAttachment>();
  // Initial attachment for results count
  attachments.push({
    collapsed: false,
    color: '#00CE00',
    title: {
      value: 'Results (' + tempResults.length + ')',
    },
    text: query ? 'Query: `' + query + '`' : '',
  });

  // tslint:disable-next-line:prefer-for-of
  for (let x = 0; x < tempResults.length; x++) {
    const result = tempResults[x];

    let text = '';

    const fields = new Array();

    // Wanted to do actions for request, but can't pass tokens or headers, just urls...
    // TODO: Revisit when the API has matured and allows for complex HTTP requests with Bearer * headers.
    const actions = new Array<IMessageAction>();

    fields.push({
      short: true,
      title: 'Id',
      value: result.id,
    });
    if (result.requestedDate && result.requestedUser && result.requestedUser.userAlias) {
      fields.push({
        short: true,
        title: 'Requested',
        value: result.requestedDate + '\n' + result.requestedUser.userAlias,
      });
    }
    if (result.status) {
      fields.push({
        short: true,
        title: 'Release Status',
        value: result.status,
      });
    }
    if (result.releaseDate) {
      fields.push({
        short: true,
        title: 'Released on',
        value: result.releaseDate,
      });
    }
    if (result.digitalReleaseDate !== undefined) {
      fields.push({
        short: true,
        title: 'Digitally Released on',
        value: result.digitalReleaseDate,
      });
    }
    if (result.available !== undefined) {
      fields.push({
        short: true,
        title: 'Available on Server?',
        value: result.available,
      });
    }

    if (result.plexUrl) {
      actions.push({
        type: MessageActionType.BUTTON,
        url: result.plexUrl,
        text: 'View on Plex',
        msg_in_chat_window: false,
        msg_processing_type: MessageProcessingType.SendMessage,
      });
    }
    if (result.imdbId) {
      actions.push({
        type: MessageActionType.BUTTON,
        url: 'https://www.imdb.com/title/' + result.imdbId,
        text: 'View on IMDb',
        msg_in_chat_window: false,
        msg_processing_type: MessageProcessingType.SendMessage,
      });
    }
    if (result.theMovieDbId) {
      actions.push({
        type: MessageActionType.BUTTON,
        url: 'https://www.themoviedb.org/movie/' + result.theMovieDbId,
        text: 'View on TheMovieDB',
        msg_in_chat_window: false,
        msg_processing_type: MessageProcessingType.SendMessage,
      });
    }
    if (result.theTvDbId) {
      actions.push({
        type: MessageActionType.BUTTON,
        url: 'https://www.thetvdb.com/dereferrer/series/' + result.theTvDbId,
        text: 'View on TheTVDB',
        msg_in_chat_window: false,
        msg_processing_type: MessageProcessingType.SendMessage,
      });
    }

    if (result.voteAverage && !isNaN(result.voteAverage) && result.voteCount && !isNaN(result.voteCount)) {
      text += '*Rating: *' + Number(result.voteAverage).toFixed(1) + ' (' + Number(result.voteCount) + ' ratings)' + '\n';
    }
    if (result.rating && !isNaN(result.rating)) {
      text += '*Rating: *' + Number(result.rating).toFixed(1) + '\n';
    }
    if (result.originalLangugage) {
      text += '*Language: *' + result.originalLanguage + '\n';
    }
    if (result.network) {
      text += '*Network: *' + result.network + '\n';
    }
    if (result.runtime) {
      text += '*Runtime: *' + result.runtime + ' minutes\n';
    }
    if (result.totalSeasons && result.totalSeasons > 0) {
      text += '*Total Seasons: *' + result.totalSeasons + '\n';
    }

    if (result.childRequests && Array.isArray(result.childRequests) && result.childRequests.length === 1) {
      const seasonsRequested = result.childRequests[0].seasonRequests;
      if (seasonsRequested && Array.isArray(seasonsRequested) && seasonsRequested.length > 0) {
        text += '*[Episodes Requested]*\n';
        seasonsRequested.forEach((season) => {
          text += '::::*Season ' + season.seasonNumber + ':*\n';
          if (season.episodes && Array.isArray(season.episodes) && season.episodes.length > 0) {
            season.episodes.forEach((episode) => {
              text += '------*Episode ' + episode.episodeNumber + ' - ' + episode.title + '*\n';
              text += '__________*Link: *' + episode.url + '\n';
              text += '__________*Approved? *' + episode.approved + '\n';
              text += '__________*Available?: *' + episode.available + '\n';
              text += '__________*Season Id: *' + episode.seasonId + '\n';
              text += '__________*Id: *' + episode.id + '\n';
            });
          }
        });
      }
    }
    if (result.firstAired) {
      text += '*First Aired on *' + result.firstAired + '\n';
    }
    let typeTemp = type;
    if (typeTemp === 'tv') {
      typeTemp = 'show';
    }
    actions.push({
      type: MessageActionType.BUTTON,
      text: 'Request ' + typeTemp,
      msg: '/ombi request ' + type + ' ' + result.id + ' (first|latest|all)',
      msg_in_chat_window: true,
      msg_processing_type: MessageProcessingType.RespondWithMessage,
    });
    if (result.overview) {
      text += '\n*Overview: *' + result.overview;
    }

    attachments.push({
      collapsed: tempResults.length === 1 ? false : true,
      color: '#e37200',
      title: {
        value: result.title,
        link: serverAddress,
      },
      fields,
      actions,
      text,
    });
  }

  await sendNotificationMultipleAttachments(attachments, read, modify, user, room);
}
