/* global firebase, importScripts */
importScripts('https://www.gstatic.com/firebasejs/11.1.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.1.0/firebase-messaging-compat.js');
const query = new URL(self.location.href).searchParams;
firebase.initializeApp(
  Object.fromEntries(
    ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'].map(
      (key) => [key, query.get(key)],
    ),
  ),
);
firebase.messaging().onBackgroundMessage((payload) => {
  const notification = payload.notification ?? {};
  self.registration.showNotification(notification.title ?? 'Synapse', {
    body: notification.body,
    data: payload.data,
  });
});
