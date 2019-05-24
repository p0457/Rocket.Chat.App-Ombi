import { IModify, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { IMessageAttachment } from '@rocket.chat/apps-engine/definition/messages';
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

export async function sendRequestMetadata(requests, serverAddress, read: IRead, modify: IModify, user: IUser, room: IRoom): Promise<void> {
  const attachments = new Array<IMessageAttachment>();
  // Initial attachment for results count
  attachments.push({
    collapsed: false,
    color: '#00CE00',
    title: {
      value: 'Results (' + requests.length + ')',
    },
  });

  // tslint:disable-next-line:prefer-for-of
  for (let x = 0; x < requests.length; x++) {
    const request = requests[x];

    let text = '';

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
    if (request.requestedDate) {
      text += '*Requested *' + request.requestedDate + '\n';
    }
    if (request.requestedUser && request.requestedUser.userAlias) {
      text += '*Requested By *' + request.requestedUser.userAlias + '\n';
    }
    if (request.status) {
      text += '*Release Status: *' + request.status + '\n';
    }
    if (request.releaseDate) {
      text += '*Released on *' + request.releaseDate + '\n';
    }
    if (request.digitalRelease !== undefined) {
      text += '*Digital Release? *' + request.digitalRelease + '\n';
    }
    if (request.approved !== undefined) {
      text += '*Approved by Admin? *' + request.approved + '\n';
    } else {
      if (request.childRequests && Array.isArray(request.childRequests) && request.childRequests.length === 1) {
        if (request.childRequests[0].approved !== undefined) {
          text += '*Approved by Admin? *' + request.childRequests[0].approved + '\n';
        }
      }
    }
    if (request.available !== undefined) {
      text += '*Available on Server? *' + request.available + '\n';
    }
    text += '*Id: *' + request.id + '\n';
    if (request.overview) {
      text += '\n' + request.overview;
    }

    attachments.push({
      collapsed: true,
      color: '#e37200',
      title: {
        value: request.title,
        link: serverAddress,
      },
      text,
    });
  }

  await sendNotificationMultipleAttachments(attachments, read, modify, user, room);
}
