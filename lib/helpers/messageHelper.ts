import { IModify, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { IMessageAction, IMessageAttachment, MessageActionButtonsAlignment, MessageActionType, MessageProcessingType } from '@rocket.chat/apps-engine/definition/messages';
import { IRoom } from '@rocket.chat/apps-engine/definition/rooms';
import { IUser } from '@rocket.chat/apps-engine/definition/users';
import { formatDate, getYear, timeSince } from './dates';
import usage from './usage';

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

export async function sendUsage(read: IRead, modify: IModify, user: IUser, room: IRoom, scope: string, additionalText?): Promise<void> {
  let text = '';

  let usageObj = usage[scope];
  if (!usageObj) {
    for (const p in usage) {
      if (usage.hasOwnProperty(p)) {
        if (usage[p].command === scope) {
          usageObj = usage[p];
        }
      }
    }
  }
  if (usageObj && usageObj.command && usageObj.usage && usageObj.description) {
    text = '*Usage: *' + usageObj.usage + '\n>' + usageObj.description;
  }

  if (additionalText) {
    text = additionalText + '\n' + text;
  }

  // tslint:disable-next-line:max-line-length
  await this.sendNotification(text, read, modify, user, room);
  return;
}

export async function sendTokenExpired(read: IRead, modify: IModify, user: IUser, room: IRoom): Promise<void> {
  await sendNotificationSingleAttachment({
    collapsed: false,
    color: '#e10000',
    title: {
      value: 'Token Expired!',
    },
    text: 'Please login again using `/ombi-login [USERNAME] [PASSWORD]`',
  }, read, modify, user, room);
}

export async function sendRequestMetadata(requests, serverAddress, requestType, read: IRead, modify: IModify, user: IUser, room: IRoom, query?: string): Promise<void> {
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

    let canApprove = false;
    if (request.approved !== undefined) {
      canApprove = !request.approved;
      if (request.canApprove !== undefined) {
        canApprove = request.canApprove;
      }
    } else if (request.childRequests && request.childRequests[0].approved !== undefined) {
      canApprove = request.childRequests[0].approved;
    }
    let canMarkAvailable = false;
    if (request.available !== undefined) {
      canMarkAvailable = !request.available;
    } else if (request.childRequests && request.childRequests[0].available !== undefined) {
      canMarkAvailable = !request.childRequests[0].available;
    }
    let canMarkUnavailable = false;
    if (request.available !== undefined) {
      canMarkUnavailable = request.available;
    } else if (request.childRequests && request.childRequests[0].available !== undefined) {
      canMarkUnavailable = request.childRequests[0].available;
    }
    let canDeny = false;
    if (request.denied !== undefined) {
      canDeny = !request.denied;
    } else if (request.childRequests && request.childRequests[0].denied !== undefined) {
      canDeny = !request.childRequests[0].denied;
    }

    // FIELDS

    const fields = new Array();

    fields.push({
      short: true,
      title: 'Id',
      value: request.id,
    });
    if (request.requestedDate && request.requestedUser && request.requestedUser.userAlias) {
      fields.push({
        short: true,
        title: 'Requested',
        value: formatDate(request.requestedDate) + '\n_(' + timeSince(request.requestedDate) + ')_\n' + request.requestedUser.userAlias,
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
        title: timeSince(request.releaseDate).indexOf('ago') !== -1 ? 'Released on' : 'Releases on',
        value: formatDate(request.releaseDate) + '\n_(' + timeSince(request.releaseDate) + ')_\n',
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

    // ACTIONS

    // Wanted to do actions for approve/mark available, but can't pass tokens or headers, just urls...
    // TODO: Revisit when the API has matured and allows for complex HTTP requests with Bearer * headers.
    const actions = new Array<IMessageAction>();

    if (request.plexUrl) {
      actions.push({
        type: MessageActionType.BUTTON,
        url: request.plexUrl,
        text: 'View on Plex',
        msg_in_chat_window: false,
        msg_processing_type: MessageProcessingType.SendMessage,
      });
    }
    if (request.imdbId) {
      actions.push({
        type: MessageActionType.BUTTON,
        url: 'https://www.imdb.com/title/' + request.imdbId,
        text: 'View on IMDb',
        msg_in_chat_window: false,
        msg_processing_type: MessageProcessingType.SendMessage,
      });
    }
    if (request.theMovieDbId) {
      actions.push({
        type: MessageActionType.BUTTON,
        url: 'https://www.themoviedb.org/movie/' + request.theMovieDbId,
        text: 'View on TheMovieDB',
        msg_in_chat_window: false,
        msg_processing_type: MessageProcessingType.SendMessage,
      });
    }
    if (request.theTvDbId) {
      actions.push({
        type: MessageActionType.BUTTON,
        url: 'https://www.thetvdb.com/dereferrer/series/' + request.theTvDbId,
        text: 'View on TheTVDB',
        msg_in_chat_window: false,
        msg_processing_type: MessageProcessingType.SendMessage,
      });
    }
    if (request.tvDbId) {
      actions.push({
        type: MessageActionType.BUTTON,
        url: 'https://www.thetvdb.com/dereferrer/series/' + request.tvDbId,
        text: 'View on TheTVDB',
        msg_in_chat_window: false,
        msg_processing_type: MessageProcessingType.SendMessage,
      });
    }
    if (canApprove) {
      let approveText = 'Approve ';
      if (requestType === 'movie') {
        approveText += 'Movie';
      } else {
        approveText += 'Entire Show';
      }
      const apporoveCmd = '/ombi-approve ' + requestType + ' ';
      actions.push({
        type: MessageActionType.BUTTON,
        text: approveText,
        msg: apporoveCmd + request.id,
        msg_in_chat_window: true,
        msg_processing_type: MessageProcessingType.RespondWithMessage,
      });

      if (request.childRequests && Array.isArray(request.childRequests) && request.childRequests.length === 1) {
        const seasonsRequested = request.childRequests[0].seasonRequests;
        if (seasonsRequested && Array.isArray(seasonsRequested) && seasonsRequested.length > 0) {
          seasonsRequested.forEach((season) => {
            actions.push({
              type: MessageActionType.BUTTON,
              text: 'Approve Season ' + season.seasonNumber,
              msg: apporoveCmd + season.id, // TODO: Make sure this works, might have to do whole season based on website limitations...
              msg_in_chat_window: true,
              msg_processing_type: MessageProcessingType.RespondWithMessage,
            });
          });
        }
      }
    }
    if (canMarkAvailable) {
      let availableText = 'Mark ';
      if (requestType === 'movie') {
        availableText += 'Movie Available';
      } else {
        availableText += 'Entire Show Available';
      }
      const availableCmd = '/ombi-markavailable ' + requestType + ' ';
      actions.push({
        type: MessageActionType.BUTTON,
        text: availableText,
        msg: availableCmd + request.id,
        msg_in_chat_window: true,
        msg_processing_type: MessageProcessingType.RespondWithMessage,
      });

      if (request.childRequests && Array.isArray(request.childRequests) && request.childRequests.length === 1) {
        const seasonsRequested = request.childRequests[0].seasonRequests;
        if (seasonsRequested && Array.isArray(seasonsRequested) && seasonsRequested.length > 0) {
          seasonsRequested.forEach((season) => {
            actions.push({
              type: MessageActionType.BUTTON,
              text: 'Mark Season ' + season.seasonNumber + ' Available',
              msg: availableCmd + season.id, // TODO: Make sure this works, might have to do whole season based on website limitations...
              msg_in_chat_window: true,
              msg_processing_type: MessageProcessingType.RespondWithMessage,
            });
          });
        }
      }
    }
    if (canMarkUnavailable) {
      let unavailableText = 'Mark ';
      if (requestType === 'movie') {
        unavailableText += 'Movie Unvailable';
      } else {
        unavailableText += 'Entire Show Unvailable';
      }
      const unavailableCmd = '/ombi-markunavailable ' + requestType + ' ';
      actions.push({
        type: MessageActionType.BUTTON,
        text: unavailableText,
        msg: unavailableCmd + request.id,
        msg_in_chat_window: true,
        msg_processing_type: MessageProcessingType.RespondWithMessage,
      });

      if (request.childRequests && Array.isArray(request.childRequests) && request.childRequests.length === 1) {
        const seasonsRequested = request.childRequests[0].seasonRequests;
        if (seasonsRequested && Array.isArray(seasonsRequested) && seasonsRequested.length > 0) {
          seasonsRequested.forEach((season) => {
            actions.push({
              type: MessageActionType.BUTTON,
              text: 'Mark Season ' + season.seasonNumber + ' Unvailable',
              msg: unavailableCmd + season.id, // TODO: Make sure this works, might have to do whole season based on website limitations...
              msg_in_chat_window: true,
              msg_processing_type: MessageProcessingType.RespondWithMessage,
            });
          });
        }
      }
    }
    if (canDeny) {
      let denyText = 'Deny ';
      if (requestType === 'movie') {
        denyText += 'Movie Request';
      } else {
        denyText += 'Entire Show Request';
      }
      const denyCmd = '/ombi-deny ' + requestType + ' ';
      actions.push({
        type: MessageActionType.BUTTON,
        text: denyText,
        msg: denyCmd + request.id,
        msg_in_chat_window: true,
        msg_processing_type: MessageProcessingType.RespondWithMessage,
      });

      if (request.childRequests && Array.isArray(request.childRequests) && request.childRequests.length === 1) {
        const seasonsRequested = request.childRequests[0].seasonRequests;
        if (seasonsRequested && Array.isArray(seasonsRequested) && seasonsRequested.length > 0) {
          seasonsRequested.forEach((season) => {
            actions.push({
              type: MessageActionType.BUTTON,
              text: 'Deny Season ' + season.seasonNumber + ' Request',
              msg: denyCmd + season.id, // TODO: Make sure this works, might have to do whole season based on website limitations...
              msg_in_chat_window: true,
              msg_processing_type: MessageProcessingType.RespondWithMessage,
            });
          });
        }
      }
    }
    let deleteText = 'Delete ';
    if (requestType === 'movie') {
      deleteText += 'Movie Request';
    } else {
      deleteText += 'Entire Show Request';
    }
    const deleteCmd = '/ombi-delete ' + requestType + ' ';
    actions.push({
      type: MessageActionType.BUTTON,
      text: deleteText,
      msg: deleteCmd + request.id,
      msg_in_chat_window: true,
      msg_processing_type: MessageProcessingType.RespondWithMessage,
    });

    if (request.childRequests && Array.isArray(request.childRequests) && request.childRequests.length === 1) {
      const seasonsRequested = request.childRequests[0].seasonRequests;
      if (seasonsRequested && Array.isArray(seasonsRequested) && seasonsRequested.length > 0) {
        seasonsRequested.forEach((season) => {
          actions.push({
            type: MessageActionType.BUTTON,
            text: 'Delete Season ' + season.seasonNumber + ' Request',
            msg: deleteCmd + season.id, // TODO: Make sure this works, might have to do whole season based on website limitations...
            msg_in_chat_window: true,
            msg_processing_type: MessageProcessingType.RespondWithMessage,
          });
        });
      }
    }

    // TEXT
    let text = '';

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
          // tslint:disable-next-line:max-line-length
          value: formatDate(request.childRequests[0].requestedDate) + '\n_(' + timeSince(request.childRequests[0].requestedDate) + ')_\n' + request.childRequests[0].requestedUser.userAlias,
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
              if (season.airDate) {
                text += '__________*Aired: *' + formatDate(season.airDate) + ' _(' + timeSince(season.airDate) + ')' + '\n';
              } else {
                text += '__________*Not Yet Aired*\n';
              }
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

    let attachmentTitle = request.title;
    const releaseYear = getYear(request.releaseDate);
    if (request.releaseDate && releaseYear && releaseYear > 1000) {
      attachmentTitle += ` (${releaseYear})`;
    }

    attachments.push({
      collapsed: requests.length === 1 ? false : true,
      color: '#e37200',
      title: {
        value: attachmentTitle,
        link: serverAddress,
      },
      fields,
      actions,
      actionButtonsAlignment: MessageActionButtonsAlignment.HORIZONTAL,
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
        value: formatDate(result.requestedDate) + '\n' + result.requestedUser.userAlias,
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
        title: timeSince(result.releaseDate).indexOf('ago') !== -1 ? 'Released on' : 'Releases on',
        value: formatDate(result.releaseDate) + '\n_(' + timeSince(result.releaseDate) + ')_',
      });
    }
    if (result.digitalReleaseDate !== undefined) {
      fields.push({
        short: true,
        title: timeSince(result.releaseDate).indexOf('ago') !== -1 ? 'Digitally Released on' : 'Digitally Releases on',
        value: formatDate(result.digitalReleaseDate) + '\n_(' + timeSince(result.digitalReleaseDate) + ')_\n',
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
    if (result.tvDbId) {
      actions.push({
        type: MessageActionType.BUTTON,
        url: 'https://www.thetvdb.com/dereferrer/series/' + result.tvDbId,
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
    const requestMsg = '/ombi-request ' + type + ' ' + result.id;
    if (type === 'tv') {
      actions.push({
        type: MessageActionType.BUTTON,
        text: 'Request ' + typeTemp + ' (first season)',
        msg: requestMsg + ' first',
        msg_in_chat_window: true,
        msg_processing_type: MessageProcessingType.RespondWithMessage,
      });
      actions.push({
        type: MessageActionType.BUTTON,
        text: 'Request ' + typeTemp + ' (latest season)',
        msg: requestMsg + ' latest',
        msg_in_chat_window: true,
        msg_processing_type: MessageProcessingType.RespondWithMessage,
      });
      actions.push({
        type: MessageActionType.BUTTON,
        text: 'Request ' + typeTemp + ' (all seasons)',
        msg: requestMsg + ' all',
        msg_in_chat_window: true,
        msg_processing_type: MessageProcessingType.RespondWithMessage,
      });
    } else {
      actions.push({
        type: MessageActionType.BUTTON,
        text: 'Request ' + typeTemp,
        msg: requestMsg,
        msg_in_chat_window: true,
        msg_processing_type: MessageProcessingType.RespondWithMessage,
      });
    }
    if (result.overview) {
      text += '\n*Overview: *' + result.overview;
    }

    let attachmentTitle = result.title;
    let releaseYear = getYear(result.releaseDate);
    if (result.releaseDate && releaseYear && releaseYear > 1000) {
      attachmentTitle += ` (${releaseYear})`;
    } else if (result.firstAired) {
      releaseYear = getYear(result.firstAired);
      if (releaseYear && releaseYear > 1000) {
        attachmentTitle += ` (${releaseYear})`;
      }
    }

    attachments.push({
      collapsed: tempResults.length === 1 ? false : true,
      color: '#e37200',
      title: {
        value: attachmentTitle,
        link: serverAddress,
      },
      fields,
      actions,
      actionButtonsAlignment: MessageActionButtonsAlignment.HORIZONTAL,
      text,
    });
  }

  await sendNotificationMultipleAttachments(attachments, read, modify, user, room);
}
