import React, { useContext, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { LanguageContext } from '../context/LanguageContext';
import { db } from '../firebase/config';
import {
  collection,
  query,
  where,
  onSnapshot,
  getDoc,
  doc,
  deleteDoc,
  getDocs,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';

const normalizeId = (value) => {
  if (!value) return '';
  const digits = value.toString().replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : value.toString();
};

const ChatAvatar = ({ name, profilePhotoUrl }) => {
  const [imgError, setImgError] = useState(false);
  const shouldShowImage = profilePhotoUrl && !imgError;

  if (shouldShowImage) {
    return (
      <Image
        source={{ uri: profilePhotoUrl }}
        style={styles.avatarImage}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <View style={styles.avatarCircle}>
      <Text style={styles.avatarLetter}>{(name || '?').charAt(0).toUpperCase()}</Text>
    </View>
  );
};

const CHAT_RETENTION_MS = 24 * 60 * 60 * 1000;

const formatTimestamp = (value) => {
  if (!value) return '';
  if (typeof value?.toDate === 'function') {
    return value.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  const numericValue = typeof value === 'number' ? value : parseInt(value, 10);
  if (!Number.isNaN(numericValue)) {
    return new Date(numericValue).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return String(value);
};

export default function ChatList({ navigation }) {
  const { t } = useContext(LanguageContext);
  const theme = useTheme();
  const [conversations, setConversations] = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(null);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadConversations = useCallback(async () => {
    setHasError(false);
    setErrorMessage('');
    try {
      const phone = await AsyncStorage.getItem('userPhoneNumber');
      const userId = await AsyncStorage.getItem('userId');
      const accessToken = await AsyncStorage.getItem('vcare_access_token');
      const loggedIn = !!phone || !!userId || !!accessToken;
      setIsLoggedIn(loggedIn);

      if (!loggedIn) {
        setLoading(false);
        Alert.alert(t('loginRequired'), t('registerLoginToAccessChat'), [
          { text: t('okButton'), onPress: () => navigation.navigate('Register') },
        ]);
        return;
      }

      const normalizedId = normalizeId(userId || phone);
      setCurrentUserId(normalizedId);
      setLoading(true);

      const conversationsQuery = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', normalizedId)
      );

      const unsubscribe = onSnapshot(
        conversationsQuery,
        async (snapshot) => {
          const convs = [];
          const profileIds = new Set();

          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const participants = Array.isArray(data.participants) ? data.participants : [];
            const otherId = participants.map(normalizeId).find((id) => id !== normalizedId) || normalizedId;
            profileIds.add(otherId);
            convs.push({ conversationId: docSnap.id, contactId: otherId, ...data });
          });

          const profiles = {};
          await Promise.all(
            Array.from(profileIds).map(async (id) => {
              try {
                const profileDoc = await getDoc(doc(db, 'Mobile_Numbers', id, 'profile_details', 'details'));
                if (profileDoc.exists()) {
                  profiles[id] = profileDoc.data();
                }
              } catch (error) {
                console.warn('ChatList: profile fetch failed', id, error);
              }
            })
          );

          const cutoffTime = Date.now() - CHAT_RETENTION_MS;
          const latestConversations = new Map();
          convs.forEach((conv) => {
            const time = conv.lastMessageTimestamp
              || (conv.lastMessageTime?.toMillis ? conv.lastMessageTime.toMillis() : conv.lastMessageTime)
              || 0;
            if (time && time <= cutoffTime) return;
            const existing = latestConversations.get(conv.contactId);
            if (!existing || time > existing.lastMessageTime) {
              latestConversations.set(conv.contactId, { ...conv, lastMessageTime: time });
            }
          });

          const mapped = Array.from(latestConversations.values())
            .map((conv) => ({
              id: conv.conversationId,
              contactId: conv.contactId,
              name: profiles[conv.contactId]?.name || conv.receiverName || conv.senderName || conv.contactId,
              avatar: profiles[conv.contactId]?.profilePhotoUrl || profiles[conv.contactId]?.profilePhoto || profiles[conv.contactId]?.avatar || null,
              lastMessage: conv.lastMessage || 'No messages yet',
              time: formatTimestamp(conv.lastMessageTime),
              lastMessageTime: typeof conv.lastMessageTime?.toMillis === 'function'
                ? conv.lastMessageTime.toMillis()
                : typeof conv.lastMessageTime === 'number'
                  ? conv.lastMessageTime
                  : parseInt(conv.lastMessageTime, 10) || 0,
              unreadCount: conv.senderId === normalizedId ? 0 : conv.unreadCount || 0,
            }))
            .sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));

          setConversations(mapped);
          setLoading(false);
          setHasError(false);
        },
        (error) => {
          console.error('ChatList: conversation listener failed', error);
          setLoading(false);
          setHasError(true);
          setErrorMessage(t('networkOrFirebaseError') || 'Unable to connect to chat server. Please check your network connection.');
        }
      );

      return unsubscribe;
    } catch (error) {
      console.warn('ChatList: failed to load conversations', error);
      setLoading(false);
      setHasError(true);
      setErrorMessage(t('networkOrFirebaseError') || 'Unable to load conversations. Please check your network connection.');
    }
  }, [navigation, t]);

  useFocusEffect(
    useCallback(() => {
      let unsubscribePromise = loadConversations();
      return () => {
        unsubscribePromise.then((unsub) => unsub?.());
      };
    }, [loadConversations])
  );

  const handleConversationPress = (item) => {
    navigation.navigate('ChatScreen', {
      contact: {
        id: item.contactId,
        name: item.name,
        avatar: item.avatar,
      },
    });
  };

  const deleteConversation = async (conversation) => {
    if (!currentUserId || !conversation?.contactId) return;

    try {
      const normalizedContactId = normalizeId(conversation.contactId);
      const messagesQuery = query(
        collection(db, 'chats'),
        where('participants', 'array-contains', currentUserId)
      );
      const messagesSnapshot = await getDocs(messagesQuery);
      const messagesToDelete = [];

      messagesSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const participants = Array.isArray(data.participants) ? data.participants.map(normalizeId) : [];
        if (participants.includes(normalizedContactId) && participants.includes(currentUserId)) {
          messagesToDelete.push(docSnap.ref);
        }
      });

      await Promise.all(messagesToDelete.map((ref) => deleteDoc(ref)));
      const conversationId = [currentUserId, normalizedContactId].sort().join('_');
      await deleteDoc(doc(db, 'conversations', conversationId));
      setConversations((prev) => prev.filter((item) => item.id !== conversation.id));
      setShowDeleteConfirm(false);
      setSelectedConversation(null);
      setShowMenuModal(false);
    } catch (error) {
      console.error('ChatList: delete conversation failed', error);
      Alert.alert(t('error') || 'Error', t('failedToDeleteChat') || 'Failed to delete chat. Please try again.');
    }
  };

  const confirmDeleteConversation = (conversation) => {
    setShowMenuModal(false);
    setSelectedConversation(conversation);
    setShowDeleteConfirm(true);
  };

  const reportConversation = async (conversation) => {
    setShowMenuModal(false);
    if (!currentUserId || !conversation) return;

    Alert.alert(
      t('report') || 'Report',
      t('reportMessage') || 'Are you sure you want to report this conversation?',
      [
        { text: t('cancel') || 'Cancel', style: 'cancel' },
        {
          text: t('report') || 'Report',
          style: 'destructive',
          onPress: async () => {
            try {
              await addDoc(collection(db, 'reports'), {
                reportedUserId: conversation.contactId,
                reportedBy: currentUserId,
                conversationId: conversation.id,
                reason: 'User reported conversation',
                timestamp: serverTimestamp(),
                userDetails: { reportedUserName: conversation.name },
              });
              Alert.alert(t('success') || 'Success', t('reportSentSuccessfully') || 'Report sent successfully');
            } catch (error) {
              console.error('ChatList: report failed', error);
              Alert.alert(t('error') || 'Error', t('failedToSendReport') || 'Failed to send report. Please try again.');
            }
          },
        },
      ]
    );
  };

  const renderConversationItem = ({ item }) => (
    <View style={[styles.conversationItem, { backgroundColor: theme.colors.surface, flexDirection: 'row', alignItems: 'center' }]}> 
      <TouchableOpacity
        style={{ flexDirection: 'row', flex: 1, alignItems: 'center' }}
        onPress={() => handleConversationPress(item)}
        activeOpacity={0.7}
      >
        <View style={{ marginRight: 12 }}>
          <ChatAvatar name={item.name} profilePhotoUrl={item.avatar} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Text style={[styles.conversationName, { color: theme.colors.text, marginBottom: 4 }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[styles.conversationSnippet, { color: theme.colors.placeholder }]} numberOfLines={2}>
            {item.lastMessage}
          </Text>
        </View>
      </TouchableOpacity>

      <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8 }}>
        <Text style={[styles.conversationTime, { color: '#25D366', fontWeight: '600' }]}>{item.time}</Text>
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation?.();
            setSelectedConversation(item);
            setShowMenuModal(true);
          }}
          style={{ padding: 8, marginLeft: 6 }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="dots-vertical" size={26} color={theme.colors.text} />
        </TouchableOpacity>
      </View>
      {item.unreadCount > 0 && (
        <View style={[styles.unreadBadge, { backgroundColor: theme.colors.error, marginLeft: 8 }]}> 
          <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>{item.unreadCount > 9 ? '9+' : item.unreadCount}</Text>
        </View>
      )}
    </View>
  );

  if (isLoggedIn === null || loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }]}> 
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  if (hasError) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
        <MaterialCommunityIcons name="wifi-off" size={64} color="#ff6b6b" style={{ marginBottom: 16 }} />
        <Text style={{ color: theme.colors.text, fontSize: 16, textAlign: 'center', marginBottom: 24, lineHeight: 22 }}>
          {errorMessage || 'Unable to load conversations. Please check your network connection.'}
        </Text>
        <TouchableOpacity
          onPress={() => loadConversations()}
          style={{ backgroundColor: 'rgb(211, 16, 16)', paddingVertical: 12, paddingHorizontal: 28, borderRadius: 25, elevation: 2 }}
        >
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>{t('retry') || 'Retry'}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!isLoggedIn) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }]}> 
        <Text style={{ color: theme.colors.text, fontSize: 18, marginBottom: 20, textAlign: 'center' }}>
          {t('registerToAccessChats')}
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate('Register')} style={{ backgroundColor: theme.colors.primary, padding: 10, borderRadius: 5 }}>
          <Text style={{ color: '#fff' }}>{t('registerNow')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}> 
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={renderConversationItem}
        contentContainerStyle={{ paddingBottom: 100 }}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#f0f0f0' }} />}
      />
      <TouchableOpacity
        style={[styles.floatingSearchButton, { backgroundColor: theme.colors.primary }]}
        onPress={() => navigation.navigate('SearchUser')}
      >
        <MaterialCommunityIcons name="magnify" size={24} color="#fff" />
      </TouchableOpacity>

      <Modal
        visible={showMenuModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMenuModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackground} activeOpacity={1} onPress={() => setShowMenuModal(false)} />
          <View style={[styles.menuContainer, { backgroundColor: theme.colors.surface }]}> 
            <TouchableOpacity
              style={[styles.menuOption, { borderBottomColor: theme.colors.outline }]}
              onPress={() => {
                setShowMenuModal(false);
                if (selectedConversation) {
                  navigation.navigate('UserProfile', { phoneNumber: selectedConversation.contactId });
                }
              }}
            >
              <MaterialCommunityIcons name="account" size={20} color={theme.colors.primary} />
              <Text style={[styles.menuText, { color: theme.colors.text }]}> 
                {t('viewProfile') || 'View Profile'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.menuOption, { borderBottomColor: theme.colors.outline }]}
              onPress={() => selectedConversation && reportConversation(selectedConversation)}
            >
              <MaterialCommunityIcons name="flag" size={20} color="#FF6B6B" />
              <Text style={[styles.menuText, { color: '#FF6B6B' }]}> 
                {t('report') || 'Report'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuOptionLast}
              onPress={() => selectedConversation && confirmDeleteConversation(selectedConversation)}
            >
              <MaterialCommunityIcons name="delete" size={20} color="#FF6B6B" />
              <Text style={[styles.menuText, { color: '#FF6B6B', fontWeight: '600' }]}> 
                {t('deleteChat') || 'Delete Chat'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal
        visible={showDeleteConfirm}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackground} activeOpacity={1} onPress={() => setShowDeleteConfirm(false)} />
          <View style={[styles.confirmContainer, { backgroundColor: theme.colors.surface }]}> 
            <Text style={[styles.confirmTitle, { color: theme.colors.text }]}> 
              {t('confirmDelete') || 'Confirm Delete'}
            </Text>
            <Text style={[styles.confirmMessage, { color: theme.colors.placeholder }]}> 
              {t('deleteConversationMessage') || 'Are you sure you want to delete this chat and remove it from your messages?'}
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity style={[styles.confirmButton, styles.cancelButton]} onPress={() => setShowDeleteConfirm(false)}>
                <Text style={styles.cancelText}>{t('cancel') || 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.confirmButton, styles.deleteButton]} onPress={() => selectedConversation && deleteConversation(selectedConversation)}>
                <Text style={styles.deleteText}>{t('delete') || 'Delete'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  conversationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  conversationName: {
    fontSize: 17,
    fontWeight: '600',
  },
  conversationSnippet: {
    fontSize: 14,
    marginTop: 3,
  },
  conversationTime: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  unreadBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: '#FF6B6B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  avatarImage: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    backgroundColor: '#CC0000',
  },
  avatarCircle: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    backgroundColor: '#CC0000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  floatingSearchButton: {
    position: 'absolute',
    right: 20,
    bottom: 100,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  menuContainer: {
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  menuOptionLast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  menuText: {
    marginLeft: 12,
    fontSize: 16,
  },
  modalBackground: {
    flex: 1,
  },
  confirmContainer: {
    padding: 20,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    marginHorizontal: 16,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
  },
  confirmMessage: {
    fontSize: 15,
    marginBottom: 22,
    lineHeight: 22,
  },
  confirmButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#E0E0E0',
    marginRight: 10,
  },
  deleteButton: {
    backgroundColor: '#FF6B6B',
  },
  cancelText: {
    color: '#333',
    fontWeight: '600',
  },
  deleteText: {
    color: '#fff',
    fontWeight: '600',
  },
});
