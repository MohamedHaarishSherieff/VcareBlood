import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../firebase/config';
import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';

// Configure foreground notification behavior (WhatsApp style popup banner + sound)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  /**
   * Register device for push notifications and save Expo Push Token to user profile in Firestore
   */
  async registerForPushNotifications() {
    try {
      if (Platform.OS === 'web') {
        console.log('Push notifications: web platform detected, skipping Expo native token.');
        return null;
      }

      if (!Device.isDevice) {
        console.log('Push notifications: must use physical device for Push Notifications');
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Push notifications: permission not granted');
        return null;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync().catch(err => {
        console.warn('Error fetching Expo Push Token:', err);
        return null;
      });

      if (!tokenData || !tokenData.data) return null;

      const token = tokenData.data;
      console.log('Expo Push Token generated:', token);

      // Setup Android notification channel (high importance + sound)
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('vcare-chat', {
          name: 'V-Care Messages',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#D32F2F',
          sound: 'default',
        });
      }

      // Save push token to user profile in Firestore
      const userPhone = await AsyncStorage.getItem('userPhoneNumber');
      const userId = await AsyncStorage.getItem('userId');
      const activeId = userPhone || userId;

      if (activeId) {
        const digits = activeId.replace(/\D/g, '');
        const normId = digits.length >= 10 ? digits.slice(-10) : activeId;

        const profileRef = doc(db, 'Mobile_Numbers', normId, 'profile_details', 'details');
        await setDoc(profileRef, { pushToken: token, updatedAt: serverTimestamp() }, { merge: true }).catch(err => {
          console.warn('Failed to save pushToken to Mobile_Numbers:', err);
        });
      }

      return token;
    } catch (error) {
      console.error('Error registering push notifications:', error);
      return null;
    }
  }

  /**
   * Send WhatsApp-style instant push notification to recipient device
   */
  async sendChatPushNotification({ receiverId, senderId, senderName, messageText, conversationId }) {
    try {
      if (!receiverId) return;

      const digits = receiverId.replace(/\D/g, '');
      const normReceiverId = digits.length >= 10 ? digits.slice(-10) : receiverId;

      // 1. Create notification document in Firestore for in-app notification list
      await addDoc(collection(db, 'notifications'), {
        receiverId: normReceiverId,
        senderId: senderId || '',
        senderName: senderName || 'Someone',
        type: 'chat',
        title: senderName ? `Message from ${senderName}` : 'New Message',
        body: messageText || 'Sent you a message',
        conversationId: conversationId || '',
        status: 'unread',
        createdAt: serverTimestamp(),
      }).catch(err => console.warn('Failed to store in-app notification doc:', err));

      // 2. Fetch recipient's pushToken from Firestore
      let pushToken = null;
      try {
        const profileDoc = await getDoc(doc(db, 'Mobile_Numbers', normReceiverId, 'profile_details', 'details'));
        if (profileDoc.exists()) {
          pushToken = profileDoc.data().pushToken;
        }
      } catch (err) {
        console.warn('Could not fetch pushToken for receiver:', normReceiverId, err);
      }

      if (!pushToken) {
        console.log('No pushToken registered for receiver:', normReceiverId);
        return;
      }

      // 3. Send Expo Push Notification HTTP request
      const message = {
        to: pushToken,
        sound: 'default',
        title: senderName || 'V-Care Message',
        body: messageText,
        data: {
          screen: 'ChatScreen',
          senderId: senderId,
          senderName: senderName,
          conversationId: conversationId,
        },
        priority: 'high',
        channelId: 'vcare-chat',
      };

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      const resData = await response.json();
      console.log('Expo Push API response:', resData);
    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  }
}

export const notificationService = new NotificationService();
export default notificationService;
