importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyC7_CFEbaC9cy2tcyR5JbHqsS5HfskAHo4",
  authDomain: "intouch-v2-92217.firebaseapp.com",
  projectId: "intouch-v2-92217",
  storageBucket: "intouch-v2-92217.firebasestorage.app",
  messagingSenderId: "1031162649483",
  appId: "1:1031162649483:web:0920bb8e9843c1058fad8e"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? 'InTouch';
  const body = payload.notification?.body ?? '';
  self.registration.showNotification(title, {
    body,
    icon: '/icons/icon-192.svg',
    badge: '/icons/icon-192.svg',
    data: payload.data ?? {},
  });
});
