import React, { useState, useEffect, useRef, useContext } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  TouchableOpacity,
  Text,
  Alert,
  ActivityIndicator as RNActivityIndicator,
  Modal,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar, useTheme, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

import { LanguageContext } from '../context/LanguageContext';
import { db, authentication } from '../firebase/config';
import notificationService from '../services/notificationService';
import {
  collection,
  query,
  where,
  doc,
  getDoc,
  onSnapshot,
  addDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  deleteDoc,
  getDocs,
} from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';

export default function ChatScreen({ route, navigation }) {
  const theme = useTheme();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserName, setCurrentUserName] = useState('You');
  const [isLoggedIn, setIsLoggedIn] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [contactDetails, setContactDetails] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const flatListRef = useRef(null);

  const { contact } = route.params || {};
  const { t } = useContext(LanguageContext);

  const CHAT_RETENTION_MS = 24 * 60 * 60 * 1000;

  const normalizeId = (value) => {
    if (!value) return '';
    const digits = value.toString().replace(/\D/g, '');
    return digits.length >= 10 ? digits.slice(-10) : value.toString();
  };

  const getConversationId = (user1, user2) => {
    const normalized1 = normalizeId(user1);
    const normalized2 = normalizeId(user2);
    return [normalized1, normalized2].sort().join('_');
  };

  useFocusEffect(
    React.useCallback(() => {
      const checkLogin = async () => {
        const phone = await AsyncStorage.getItem('userPhoneNumber');
        const userId = await AsyncStorage.getItem('userId');
        const accessToken = await AsyncStorage.getItem('vcare_access_token');
        const loggedIn = !!phone || !!userId || !!accessToken;
        setIsLoggedIn(loggedIn);

        if (!loggedIn) {
          Alert.alert(t('loginRequired'), t('registerLoginToAccessChat'), [
            { text: t('okButton'), onPress: () => navigation.navigate('Register') },
          ]);
          return;
        }

        const activeId = userId || phone;
        const normalizedId = normalizeId(activeId);
        setCurrentUserId(normalizedId);

        try {
          if (authentication && !authentication.currentUser) {
            await signInAnonymously(authentication);
            console.log('ChatScreen: anonymous auth successful');
          }
        } catch (anonErr) {
          console.warn('ChatScreen: anonymous sign-in failed:', anonErr);
        }

        try {
          const uid = userId || phone;
          if (uid) {
            const profileDoc = await getDoc(doc(db, 'Mobile_Numbers', uid, 'profile_details', 'details'));
            if (profileDoc.exists()) {
              setCurrentUserName(profileDoc.data().name || 'You');
            }
          }
        } catch (err) {
          console.error('ChatScreen: Error loading user name:', err);
        }
      };

      checkLogin();
    }, [navigation])
  );

  useEffect(() => {
    const applyTabBarStyle = (style) => {
      const parent = navigation.getParent();
      if (parent?.setOptions) {
        parent.setOptions(style);
      }
      const grandParent = parent?.getParent?.();
      if (grandParent?.setOptions) {
        grandParent.setOptions(style);
      }
    };

    const tabBarStyle = { tabBarStyle: [{ display: contact ? 'none' : 'flex' }] };
    applyTabBarStyle(tabBarStyle);

    return () => {
      applyTabBarStyle({ tabBarStyle: [{ display: 'flex' }] });
    };
  }, [navigation, contact]);

  useEffect(() => {
    if (!currentUserId) {
      setConversationsLoading(false);
      return;
    }

    setConversationsLoading(true);
    console.log('ChatScreen: subscribing to conversations for user', currentUserId);

    const conversationsQuery = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', currentUserId)
    );

    const unsubscribe = onSnapshot(
      conversationsQuery,
      async (snapshot) => {
        console.log('ChatScreen: conversation snapshot received:', snapshot.size);

        const convs = [];
        const profileIds = new Set();

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const participants = Array.isArray(data.participants) ? data.participants : [];
          const normalizedParticipants = participants.map(normalizeId);
          const otherId = normalizedParticipants.find((id) => id !== currentUserId) || normalizedParticipants[0];
          if (!otherId) return;

          profileIds.add(otherId);
          convs.push({
            conversationId: docSnap.id,
            ...data,
            contactId: otherId,
          });
        });

        const profiles = {};
        await Promise.all(
          Array.from(profileIds).map(async (id) => {
            try {
              const profileDoc = await getDoc(doc(db, 'Mobile_Numbers', id, 'profile_details', 'details'));
              if (profileDoc.exists()) {
                profiles[id] = profileDoc.data();
              }
            } catch (err) {
              console.warn('ChatScreen: profile load error for', id, err);
            }
          })
        );

        const cutoffTime = Date.now() - CHAT_RETENTION_MS;
        const latestConversations = new Map();
        convs.forEach((c) => {
          const time = c.lastMessageTimestamp
            || (c.lastMessageTime?.toMillis ? c.lastMessageTime.toMillis() : c.lastMessageTime)
            || 0;
          if (time && time <= cutoffTime) return;
          const existing = latestConversations.get(c.contactId);
          if (!existing || time > existing._cmpTime) {
            latestConversations.set(c.contactId, { ...c, _cmpTime: time });
          }
        });

        const mapped = Array.from(latestConversations.values())
          .map((c) => ({
            contactId: c.contactId,
            name: profiles[c.contactId]?.name || c.receiverName || c.senderName || c.contactId,
            avatar: profiles[c.contactId]?.profilePhoto || profiles[c.contactId]?.avatar || null,
            bloodGroup: profiles[c.contactId]?.bloodGroup || null,
            city: profiles[c.contactId]?.city || null,
            state: profiles[c.contactId]?.state || null,
            lastMessage: c.lastMessage || 'New message',
            lastMessageTime: c._cmpTime,
            unreadCount: c.senderId === currentUserId ? 0 : c.unreadCount || 0,
          }))
          .sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));

        setConversations(mapped);
        setConversationsLoading(false);
      },
      (err) => {
        console.error('ChatScreen: conversation listener error', err);
        setConversationsLoading(false);
      }
    );

    return unsubscribe;
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId || !contact?.id) return;

    const normalizedContactId = normalizeId(contact.id);
    setChatLoading(true);
    console.log('ChatScreen: subscribing to messages for', currentUserId, 'and', normalizedContactId);

    const messagesQuery = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', currentUserId)
    );

    const unsubscribe = onSnapshot(
      messagesQuery,
      async (snapshot) => {
        const msgs = [];
        const toMarkRead = [];
        let unread = 0;

        const cutoffTime = Date.now() - CHAT_RETENTION_MS;
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const participants = Array.isArray(data.participants) ? data.participants.map(normalizeId) : [];
          if (!participants.includes(normalizedContactId) || !participants.includes(currentUserId)) return;

          const messageTime = data.createdAt?.toMillis ? data.createdAt.toMillis() : data.createdAt || 0;
          if (messageTime && messageTime <= cutoffTime) return;

          const message = { id: docSnap.id, ...data };
          msgs.push(message);

          if (message.senderId !== currentUserId && !message.read) {
            unread += 1;
            toMarkRead.push(docSnap.ref);
          }
        });

        const sortedMsgs = msgs.sort((a, b) => {
          const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : a.createdAt || 0;
          const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : b.createdAt || 0;
          return aTime - bTime;
        });

        setMessages(sortedMsgs);
        setUnreadCount(unread);
        setChatLoading(false);
        console.log('ChatScreen: received', sortedMsgs.length, 'messages; unread:', unread);

        if (toMarkRead.length > 0) {
          await Promise.all(
            toMarkRead.map((ref) =>
              updateDoc(ref, { read: true, status: 'read' }).catch((err) => {
                console.warn('ChatScreen: mark read failed', err);
              })
            )
          );

          setUnreadCount(0);

          try {
            const conversationId = getConversationId(currentUserId, normalizedContactId);
            await setDoc(doc(db, 'conversations', conversationId), { unreadCount: 0 }, { merge: true });
          } catch (err) {
            console.warn('ChatScreen: failed to clear unread count', err);
          }
        }
      }
    );

    return unsubscribe;
  }, [currentUserId, contact?.id]);

  // WhatsApp style auto-scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  useEffect(() => {
    if (!contact?.id) return;

    const fetchContactDetails = async () => {
      try {
        const normalizedContactId = normalizeId(contact.id);
        const userDoc = await getDoc(doc(db, 'Mobile_Numbers', normalizedContactId, 'profile_details', 'details'));
        if (userDoc.exists()) {
          setContactDetails(userDoc.data());
        }
      } catch (err) {
        console.error('ChatScreen: Error fetching contact details:', err);
      }
    };

    fetchContactDetails();
  }, [contact?.id]);

  const handleMakeCall = (phoneNumber) => {
    if (!phoneNumber) return;
    const cleanPhone = phoneNumber.toString().replace(/\D/g, '');
    Linking.openURL(`tel:${cleanPhone}`).catch(() => {
      Alert.alert('Call', `Dialing ${phoneNumber}...`);
    });
  };

  const sendMessage = async () => {
    if (!text.trim() || !currentUserId || !contact?.id) return;

    const messageContent = text.trim();
    const normalizedReceiverId = normalizeId(contact.id);
    const conversationId = getConversationId(currentUserId, normalizedReceiverId);
    const timestamp = Date.now();
    const payload = {
      senderId: currentUserId,
      senderName: currentUserName,
      receiverId: normalizedReceiverId,
      text: messageContent,
      createdAt: serverTimestamp(),
      timestampText: new Date(timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      participants: [currentUserId, normalizedReceiverId],
      status: 'sent',
      read: false,
    };

    console.log('ChatScreen: sendMessage called', payload);

    try {
      setText('');
      setIsTyping(false);

      const messageRef = await addDoc(collection(db, 'chats'), payload);
      await setDoc(
        doc(db, 'conversations', conversationId),
        {
          conversationId,
          participants: [currentUserId, normalizedReceiverId],
          lastMessage: payload.text,
          lastMessageTime: serverTimestamp(),
          lastMessageTimestamp: timestamp,
          senderId: currentUserId,
          senderName: currentUserName,
          receiverId: normalizedReceiverId,
          receiverName: contact.name || normalizedReceiverId,
          unreadCount: 1,
        },
        { merge: true }
      );

      console.log('ChatScreen: message saved', messageRef.id, 'conversation updated', conversationId);

      // Trigger instant push notification to recipient device (works even if app is backgrounded or closed)
      notificationService.sendChatPushNotification({
        receiverId: normalizedReceiverId,
        senderId: currentUserId,
        senderName: currentUserName,
        messageText: messageContent,
        conversationId,
      });

    } catch (err) {
      console.error('ChatScreen: send message failed', err);
      Alert.alert('Error', 'Failed to send message');
    }
  };

  const handleTextChange = (value) => {
    setText(value);
    setIsTyping(true);

    if (typingTimeout) clearTimeout(typingTimeout);
    setTypingTimeout(
      setTimeout(() => {
        setIsTyping(false);
      }, 3000)
    );
  };

  const handleKeyPress = ({ nativeEvent }) => {
    if (nativeEvent.key !== 'Enter') return;

    // Shift+Enter should insert a new line.
    if (nativeEvent.shiftKey) {
      setText((prevText) => `${prevText}\n`);
      return;
    }

    // Enter alone sends the message.
    sendMessage();
  };

  const selectUser = (user) => {
    const selectedContact = {
      id: user.phoneNumber,
      name: user.name || user.fullName || 'Unknown',
      avatar: user.avatar || null,
      bloodGroup: user.bloodGroup || null,
      city: user.city || null,
      state: user.state || null,
    };
    navigation.setParams({ contact: selectedContact });
  };

  const deleteChat = async (contactId) => {
    try {
      setShowMenuModal(false);
      
      // Show confirmation alert
      Alert.alert(
        t('confirmDelete') || 'Confirm Delete',
        t('deleteConversationMessage') || 'Are you sure you want to delete this entire conversation permanently?',
        [
          {
            text: t('cancel') || 'Cancel',
            onPress: () => {},
            style: 'cancel',
          },
          {
            text: t('delete') || 'Delete',
            onPress: async () => {
              try {
                // Delete all messages in this conversation
                const messagesQuery = query(
                  collection(db, 'chats'),
                  where('participants', 'array-contains', currentUserId)
                );

                const messagesSnapshot = await getDocs(messagesQuery);
                const normalizedContactId = normalizeId(contactId);

                const messagesToDelete = [];
                messagesSnapshot.forEach((docSnap) => {
                  const data = docSnap.data();
                  const participants = Array.isArray(data.participants)
                    ? data.participants.map(normalizeId)
                    : [];
                  
                  if (
                    participants.includes(normalizedContactId) &&
                    participants.includes(currentUserId)
                  ) {
                    messagesToDelete.push(docSnap.ref);
                  }
                });

                // Delete all messages
                await Promise.all(
                  messagesToDelete.map((ref) => deleteDoc(ref))
                );

                // Delete the conversation document
                const conversationId = getConversationId(currentUserId, normalizedContactId);
                await deleteDoc(doc(db, 'conversations', conversationId)).catch((err) => {
                  console.warn('ChatScreen: conversation doc not found, continuing:', err);
                });

                Alert.alert(
                  t('success') || 'Success',
                  t('chatDeletedSuccessfully') || 'Chat deleted successfully'
                );

                setSelectedConversation(null);
              } catch (err) {
                console.error('ChatScreen: delete chat error', err);
                Alert.alert(
                  t('error') || 'Error',
                  t('failedToDeleteChat') || 'Failed to delete chat. Please try again.'
                );
              }
            },
            style: 'destructive',
          },
        ]
      );
    } catch (err) {
      console.error('ChatScreen: delete chat failed', err);
      Alert.alert(t('error') || 'Error', t('failedToDeleteChat') || 'Failed to delete chat');
    }
  };

  const renderChatMessage = ({ item }) => {
    const isMe = item.senderId === currentUserId;
    return (
      <View style={[styles.msgRow, isMe ? styles.msgRowRight : styles.msgRowLeft]}>
        {!isMe && (
          contact?.avatar ? (
            <Avatar.Image size={32} source={{ uri: contact.avatar }} style={{ marginRight: 8 }} />
          ) : (
            <Avatar.Text size={32} label={(contact?.name || '?').charAt(0)} style={{ backgroundColor: '#D32F2F', marginRight: 8 }} />
          )
        )}

        <View style={[styles.bubbleWrapper, isMe && styles.bubbleWrapperRight]}>
          {!isMe && (
            <Text style={styles.senderName}>{item.senderName || contact.name || 'Unknown'}</Text>
          )}

          <View
            style={[
              styles.bubble,
              isMe ? styles.sentBubble : styles.receivedBubble
            ]}
          >
            <Text style={[styles.msgText, { color: '#111B21' }]}>{item.text}</Text>
            <View style={styles.messageFooter}>
              <Text style={styles.timestamp}> 
                {item.timestampText || (item.createdAt?.toDate ? item.createdAt.toDate().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '')}
              </Text>
              {isMe && (
                <View style={styles.statusIndicator}>
                  {item.status === 'read' ? (
                    <MaterialCommunityIcons name="check-all" size={16} color="#34B7F1" />
                  ) : item.status === 'delivered' ? (
                    <MaterialCommunityIcons name="check-all" size={16} color="#8696A0" />
                  ) : (
                    <MaterialCommunityIcons name="check" size={16} color="#8696A0" />
                  )}
                </View>
              )}
            </View>
          </View>
        </View>

        {isMe && <View style={{ width: 8 }} />}
      </View>
    );
  };

  const renderConversationItem = ({ item }) => {
    const dateString = item.lastMessageTime ? new Date(item.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    return (
      <View style={[styles.conversationItem, { backgroundColor: theme.colors.surface, flexDirection: 'row', alignItems: 'center' }]}>
        <TouchableOpacity
          style={{ flexDirection: 'row', flex: 1, alignItems: 'center' }}
          onPress={() => selectUser({ phoneNumber: item.contactId, name: item.name, avatar: item.avatar, bloodGroup: item.bloodGroup, city: item.city, state: item.state })}
          activeOpacity={0.7}
        >
          <View style={{ marginRight: 12 }}>
            {item.avatar ? (
              <Avatar.Image size={55} source={{ uri: item.avatar }} />
            ) : (
              <Avatar.Text size={55} label={(item.name || '?').charAt(0)} style={{ backgroundColor: theme.colors.primary }} />
            )}
          </View>
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <Text style={[styles.conversationName, { color: theme.colors.text, marginBottom: 4 }]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={[styles.conversationSnippet, { color: theme.colors.placeholder }]} numberOfLines={2}>
              {item.lastMessage || 'No messages yet'}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8, minWidth: 100 }}>
          <Text style={[styles.conversationTime, { color: '#25D366', fontWeight: '600' }]}>{dateString}</Text>
          <TouchableOpacity
            onPress={() => {
              setSelectedConversation(item);
              setShowMenuModal(true);
            }}
            style={{ padding: 8, marginLeft: 4 }}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <MaterialCommunityIcons name="dots-vertical" size={26} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        {item.unreadCount > 0 && (
          <View style={[styles.unreadBadgeSmall, { backgroundColor: theme.colors.error, marginLeft: 8 }]}> 
            <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>{item.unreadCount > 9 ? '9+' : item.unreadCount}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <>
      {isLoggedIn === null ? (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </SafeAreaView>
      ) : !isLoggedIn ? (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={{ color: theme.colors.text, fontSize: 18, marginBottom: 20, textAlign: 'center' }}>{t('registerToAccessChats')}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')} style={{ backgroundColor: theme.colors.primary, padding: 10, borderRadius: 5 }}>
            <Text style={{ color: theme.colors.onPrimary }}>{t('registerNow')}</Text>
          </TouchableOpacity>
        </SafeAreaView>
      ) : !contact ? (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}> 
          {conversationsLoading ? (
            <View style={styles.empty}>
              <RNActivityIndicator animating size="large" color={theme.colors.primary} />
              <Text style={{ marginTop: 12, color: theme.colors.text }}>{t('loadingChats')}</Text>
            </View>
          ) : conversations.length > 0 ? (
            <View style={{ flex: 1 }}>
              <View style={styles.chatCountRow}>
                <Text style={styles.chatCountText}>
                  {t('activeConversations') + ': ' + conversations.length}
                </Text>
              </View>
              <FlatList
                data={conversations}
                keyExtractor={(item) => item.contactId}
                renderItem={renderConversationItem}
                contentContainerStyle={{ paddingBottom: 160 }}
                ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#e6e6e6', marginHorizontal: 16 }} />}
              />
            </View>
          ) : (
            <View style={styles.empty}>
              <MaterialCommunityIcons name="message-outline" size={84} color={theme.colors.placeholder} />
              <Text style={{ color: theme.colors.text, marginTop: 14, fontSize: 16, textAlign: 'center', paddingHorizontal: 30 }}>
                {t('noConversationsYet')}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.floatingSearchButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => navigation.navigate('SearchUser')}
          >
            <MaterialCommunityIcons name="magnify" size={24} color="#fff" />
          </TouchableOpacity>
        </SafeAreaView>
      ) : (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#D32F2F' }} edges={['top', 'left', 'right']}> 
          <View style={styles.whatsappHeader}> 
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <TouchableOpacity onPress={() => navigation.navigate('Chat')} style={{ padding: 4, marginRight: 4 }}>
                <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => navigation.navigate('UserProfile', { phoneNumber: contact.id })}
                style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
              >
                {contact?.avatar ? (
                  <Avatar.Image size={38} source={{ uri: contact.avatar }} />
                ) : (
                  <Avatar.Text size={38} label={(contact.name || '?').charAt(0)} style={{ backgroundColor: '#B71C1C' }} />
                )}
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={styles.whatsappHeaderName} numberOfLines={1}>
                    {contact.name}
                  </Text>
                  <Text style={styles.whatsappHeaderStatus}>
                    {isTyping ? t('typing') || 'typing...' : 'online'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Action icons: Call, Video Call, Menu */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <TouchableOpacity onPress={() => handleMakeCall(contact.id)} style={{ padding: 4 }}>
                <MaterialCommunityIcons name="phone" size={22} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleMakeCall(contact.id)} style={{ padding: 4 }}>
                <MaterialCommunityIcons name="video" size={22} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setSelectedConversation({ contactId: contact.id, name: contact.name });
                  setShowMenuModal(true);
                }}
                style={{ padding: 4 }}
              >
                <MaterialCommunityIcons name="dots-vertical" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ flex: 1, backgroundColor: '#EFEAE2' }}>
            <View style={styles.chatArea}>
              <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item) => item.id}
                renderItem={renderChatMessage}
                style={styles.messageListWrapper}
                contentContainerStyle={[styles.messageList, { paddingBottom: 100 }]}
                onEndReachedThreshold={0.1}
                ListEmptyComponent={
                  <View style={styles.emptyChat}>
                    <MaterialCommunityIcons name="message-outline" size={64} color="#64748B" />
                    <Text style={{ color: '#64748B', marginTop: 12, fontSize: 16 }}>
                      {t('noMessagesYet')}
                    </Text>
                  </View>
                }
              />
            </View>

            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
              style={styles.composerWrapper}
            >
              <View style={styles.whatsappComposer}> 
                <TouchableOpacity style={{ padding: 6 }}>
                  <MaterialCommunityIcons name="paperclip" size={22} color="#64748B" />
                </TouchableOpacity>
                <TextInput
                  style={styles.whatsappInput}
                  placeholder={t('typeAMessagePlaceholder') || 'Message'}
                  placeholderTextColor="#64748B"
                  value={text}
                  onChangeText={handleTextChange}
                  onSubmitEditing={sendMessage}
                  onKeyPress={handleKeyPress}
                  blurOnSubmit={false}
                  multiline
                  maxLength={5000}
                />
                <TouchableOpacity
                  onPress={sendMessage}
                  disabled={!text.trim()}
                  style={[styles.sendBtn, { backgroundColor: text.trim() ? theme.colors.primary : theme.colors.outline }]}
                >
                  <MaterialCommunityIcons name="send" size={20} color={text.trim() ? '#fff' : theme.colors.placeholder} />
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </View>
        </SafeAreaView>
      )}

      {/* Options Menu Modal */}
      <Modal
        visible={showMenuModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMenuModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMenuModal(false)}
        >
          <View
            style={[styles.menuContainer, { backgroundColor: theme.colors.surface }]}
            onStartShouldSetResponder={() => true}
            onTouchEndCapture={() => {}}
          >
            <TouchableOpacity
              style={[styles.menuOption, { borderBottomColor: theme.colors.outline }]}
              onPress={() => {
                setShowMenuModal(false);
                navigation.navigate('UserProfile', { phoneNumber: selectedConversation?.contactId });
              }}
            >
              <MaterialCommunityIcons name="account" size={22} color={theme.colors.primary} />
              <Text style={[styles.menuText, { color: theme.colors.text }]}>
                {t('viewProfile') || 'View Profile'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuOption, { borderBottomColor: theme.colors.outline }]}
              onPress={() => {
                setShowMenuModal(false);
                Alert.alert(
                  t('report') || 'Report',
                  t('reportMessage') || 'Are you sure you want to report this conversation?',
                  [
                    {
                      text: t('cancel') || 'Cancel',
                      style: 'cancel',
                    },
                    {
                      text: t('report') || 'Report',
                      onPress: async () => {
                        try {
                          // Save report to Firebase
                          await addDoc(collection(db, 'reports'), {
                            reportedUserId: selectedConversation?.contactId,
                            reportedBy: currentUserId,
                            conversationId: getConversationId(currentUserId, selectedConversation?.contactId),
                            reason: 'User reported conversation',
                            timestamp: serverTimestamp(),
                            userDetails: {
                              reportedUserName: selectedConversation?.name,
                              reportedByName: currentUserName,
                            },
                          });
                          Alert.alert(
                            t('success') || 'Success',
                            t('reportSentSuccessfully') || 'Report sent successfully'
                          );
                        } catch (err) {
                          console.error('ChatScreen: report failed', err);
                          Alert.alert(
                            t('error') || 'Error',
                            t('failedToSendReport') || 'Failed to send report. Please try again.'
                          );
                        }
                      },
                      style: 'destructive',
                    },
                  ]
                );
              }}
            >
              <MaterialCommunityIcons name="flag" size={22} color="#FF6B6B" />
              <Text style={[styles.menuText, { color: '#FF6B6B' }]}>
                {t('report') || 'Report'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuOptionLast}
              onPress={() => {
                setShowMenuModal(false);
                deleteChat(selectedConversation?.contactId);
              }}
            >
              <MaterialCommunityIcons name="delete" size={22} color="#FF6B6B" />
              <Text style={[styles.menuText, { color: '#FF6B6B', fontWeight: '600' }]}>
                {t('deleteChat') || 'Delete Chat'}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  whatsappHeader: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#D32F2F',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  whatsappHeaderName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  whatsappHeaderStatus: {
    color: '#FFCDD2',
    fontSize: 12,
    marginTop: 1,
  },
  header: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  unreadBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#D32F2F',
  },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  floatingSearchButton: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#D32F2F',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#D32F2F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  emptyChat: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 100 },
  chatCountRow: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#F1F5F9', marginBottom: 6 },
  chatCountText: { color: '#64748B', fontSize: 13, fontWeight: '600' },
  conversationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  conversationName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  conversationSnippet: {
    fontSize: 13,
    marginTop: 2,
    color: '#64748B',
  },
  conversationTime: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
  },
  unreadBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: '#D32F2F',
    minWidth: 22,
    alignItems: 'center',
  },
  chatArea: { flex: 1 },
  messageListWrapper: { flex: 1 },
  messageList: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 140 },
  msgRow: { flexDirection: 'row', marginVertical: 4, alignItems: 'flex-end' },
  msgRowLeft: { justifyContent: 'flex-start' },
  msgRowRight: { justifyContent: 'flex-end' },
  bubbleWrapper: { maxWidth: '82%' },
  bubbleWrapperRight: { alignItems: 'flex-end' },
  senderName: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
    marginLeft: 6,
    color: '#D32F2F',
  },
  bubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    minHeight: 36,
    justifyContent: 'center',
    maxWidth: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  sentBubble: {
    backgroundColor: '#E7FFDB',
    borderTopRightRadius: 2,
    borderWidth: 1,
    borderColor: '#D4F5C5',
  },
  receivedBubble: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  msgText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '400',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    justifyContent: 'flex-end',
    gap: 4,
  },
  timestamp: {
    fontSize: 10,
    fontWeight: '500',
    color: '#667781',
  },
  statusIndicator: { marginLeft: 2 },
  composerWrapper: {
    position: 'relative',
    width: '100%',
    backgroundColor: 'transparent',
    paddingHorizontal: 8,
    paddingBottom: Platform.OS === 'ios' ? 16 : 8,
  },
  whatsappComposer: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
    borderRadius: 24,
    marginBottom: 4,
    width: '100%',
    backgroundColor: '#FFFFFF',
    elevation: 3,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  whatsappInput: {
    flex: 1,
    minHeight: 38,
    maxHeight: 120,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 15,
    color: '#0F172A',
    ...Platform.select({
      web: { outlineStyle: 'none' },
    }),
  },
  composer: {
    flexDirection: 'row',
    padding: 8,
    alignItems: 'flex-end',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 10,
    borderRadius: 24,
    marginBottom: 8,
    width: '100%',
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#D32F2F',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    minWidth: 220,
    backgroundColor: '#FFFFFF',
    elevation: 6,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12,
  },
  menuOptionLast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  menuText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
});
