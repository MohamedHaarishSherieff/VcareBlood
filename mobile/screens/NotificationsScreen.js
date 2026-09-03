import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Alert, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Card, Avatar, Button, useTheme, IconButton } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../firebase/config';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
  getDocs,
} from 'firebase/firestore';

export default function NotificationsScreen({ navigation }) {
  const theme = useTheme();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      const checkLogin = async () => {
        const phone = await AsyncStorage.getItem('userPhoneNumber');
        if (!phone) {
          setIsLoggedIn(false);
          Alert.alert('Login Required', 'Please register/login as a donor to access notifications.', [
            { text: 'OK', onPress: () => navigation.navigate('Register') }
          ]);
        } else {
          setIsLoggedIn(true);
        }
      };

      checkLogin();
      init();
    }, [navigation])
  );

  const init = async () => {
    try {
      const phone = await AsyncStorage.getItem('userPhoneNumber');
      if (!phone) return;

      // Get userId from donors collection
      const donorQuery = query(collection(db, 'donors'), where('phone', '==', phone));
      const donorSnapshot = await getDocs(donorQuery);
      if (!donorSnapshot.empty) {
        const donorDoc = donorSnapshot.docs[0];
        const uid = donorDoc.id;
        setUserId(uid);

        // Set up notifications listener
        const notificationsQuery = query(
          collection(db, 'notifications'),
          where('receiverId', '==', uid),
          orderBy('createdAt', 'desc')
        );
        const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
          const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setNotifications(notifs);
          setLoading(false);
        });

        return unsubscribe; // To clean up later if needed
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error initializing notifications:', error);
      setLoading(false);
    }
  };

  const acceptConnection = async (n) => {
    try {
      // mark notification accepted
      await updateDoc(doc(db, 'notifications', n.id), { status: 'accepted', handledAt: serverTimestamp() });

      // update donors documents to add connection/follow
      if (n.senderId && userId) {
        const meRef = doc(db, 'donors', userId);
        const senderRef = doc(db, 'donors', n.senderId);
        await updateDoc(meRef, { followers: arrayUnion(n.senderId), connections: arrayUnion(n.senderId) });
        await updateDoc(senderRef, { following: arrayUnion(userId), connections: arrayUnion(userId) });
      }
    } catch (err) {
      console.error('Accept connection failed', err);
      Alert.alert('Error', 'Could not accept connection');
    }
  };

  const rejectConnection = async (n) => {
    try {
      await updateDoc(doc(db, 'notifications', n.id), { status: 'rejected', handledAt: serverTimestamp() });
    } catch (err) {
      console.error('Reject connection failed', err);
      Alert.alert('Error', 'Could not reject connection');
    }
  };

  const renderNotification = ({ item }) => {
    const when = item.createdAt && item.createdAt.toDate ? item.createdAt.toDate().toLocaleString() : '';
    if (item.type === 'connection') {
      return (
        <Card style={styles.card} key={item.id}>
          <Card.Title
            title={item.senderName || 'Someone'}
            subtitle={`wants to connect • ${when}`}
            left={(props) => <Avatar.Text {...props} label={(item.senderName||'?').charAt(0)} />}
            right={() => (
              <View style={{ flexDirection: 'row' }}>
                {item.status === 'pending' && (
                  <>
                    <IconButton icon="check" onPress={() => acceptConnection(item)} />
                    <IconButton icon="close" onPress={() => rejectConnection(item)} />
                  </>
                )}
                {item.status && item.status !== 'pending' && (
                  <Text style={{ alignSelf: 'center', marginRight: 8 }}>{item.status}</Text>
                )}
              </View>
            )}
          />
        </Card>
      );
    }

    if (item.type === 'like') {
      return (
        <Card style={styles.card} key={item.id} onPress={() => navigation.navigate('Post', { postId: item.postId })}>
          <Card.Title
            title={item.senderName || 'Someone'}
            subtitle={`liked your post • ${when}`}
            left={(props) => <Avatar.Text {...props} label={(item.senderName||'?').charAt(0)} />}
          />
        </Card>
      );
    }

    if (item.type === 'comment') {
      return (
        <Card style={styles.card} key={item.id} onPress={() => navigation.navigate('Post', { postId: item.postId })}>
          <Card.Title
            title={item.senderName || 'Someone'}
            subtitle={`${item.comment || 'commented on your post'} • ${when}`}
            left={(props) => <Avatar.Text {...props} label={(item.senderName||'?').charAt(0)} />}
          />
          <Card.Content>
            <Text style={{ color: '#333' }}>{item.comment}</Text>
          </Card.Content>
        </Card>
      );
    }

    if (item.type === 'chat') {
      return (
        <Card
          style={styles.card}
          key={item.id}
          onPress={() =>
            navigation.navigate('ChatScreen', {
              contact: {
                id: item.senderId,
                name: item.senderName,
              },
            })
          }
        >
          <Card.Title
            title={item.senderName || 'New Message'}
            subtitle={`${item.body || 'Sent a message'} • ${when}`}
            left={(props) => <Avatar.Text {...props} label={(item.senderName || '?').charAt(0)} style={{ backgroundColor: '#D32F2F' }} />}
          />
        </Card>
      );
    }

    // fallback
    return (
      <Card style={styles.card} key={item.id}>
        <Card.Title title={item.title || 'Notification'} subtitle={when} />
      </Card>
    );
  };

  if (!isLoggedIn) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.text, fontSize: 18, marginBottom: 20, textAlign: 'center' }}>Please register as a donor to access notifications.</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Register')} style={{ backgroundColor: theme.colors.primary, padding: 10, borderRadius: 5 }}>
          <Text style={{ color: theme.colors.onPrimary }}>Register Now</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: theme.colors.text }}>Loading notifications...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}> 
      <FlatList
        data={notifications}
        keyExtractor={(i) => i.id}
        renderItem={renderNotification}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={() => (
          <View style={styles.empty}>
            <Text style={{ color: theme.colors.placeholder }}>No notifications</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  card: {
    marginHorizontal: 16,
    marginVertical: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    overflow: 'hidden',
  },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, marginTop: 60 },
});