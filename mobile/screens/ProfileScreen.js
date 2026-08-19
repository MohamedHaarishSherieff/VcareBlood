import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Platform,
  FlatList,
  Switch
} from 'react-native';
import { Button, Card, Paragraph, Title, useTheme, Menu, Divider } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// firestore imports
import { db } from '../firebase/config';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import storageService from '../services/storageService';
import postService from '../services/postService';

const API_BASE_URL = 'http://localhost:5000/api';

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const genders = ['Male', 'Female', 'Other'];

// ── DropdownField moved outside to prevent remounts ──────────────────────
const DropdownField = ({ label, items, value, onSelect, field, isOpen, setIsOpen }) => {
  return (
    <View style={styles.dropdownContainer}>
      <TouchableOpacity
        style={[styles.dropdownButton, isOpen && styles.dropdownButtonActive]}
        onPress={() => setIsOpen(isOpen ? null : field)}
      >
        <Text style={[styles.dropdownButtonText, !value && styles.placeholderText]}>
          {value || `Select ${label}`}
        </Text>
        <MaterialCommunityIcons
          name={isOpen ? 'chevron-up' : 'chevron-down'}
          size={24}
          color="#ff6b6b"
        />
      </TouchableOpacity>

      {isOpen && (
        <View style={styles.dropdownList}>
          <FlatList
            scrollEnabled={false}
            data={items}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  onSelect(field, item);
                  setIsOpen(null);
                }}
              >
                <Text style={[
                  styles.dropdownItemText,
                  value === item && styles.dropdownItemSelected
                ]}>
                  {item}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  );
};

export default function ProfileScreen({ route, navigation }) {
  const theme = useTheme();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [posts, setPosts] = useState([]);
  const [menuVisible, setMenuVisible] = useState(false);
  const [activePostMenu, setActivePostMenu] = useState(null);

  const requestedPhoneNumber = route?.params?.phoneNumber;

  useFocusEffect(
    useCallback(() => {
      const checkLogin = async () => {
        const phone = await AsyncStorage.getItem('userPhoneNumber');
        const userId = await AsyncStorage.getItem('userId');
        const accessToken = await AsyncStorage.getItem('vcare_access_token');
        const loggedIn = !!phone || !!userId || !!accessToken;
        if (!loggedIn) {
          Alert.alert('Login Required', 'Please register/login as a donor to access your profile.', [
            { text: 'OK', onPress: () => navigation.navigate('Register') }
          ]);
          return;
        }
      };
      checkLogin();
      loadProfile();
    }, [requestedPhoneNumber, navigation])
  );

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('userPhoneNumber');
      await AsyncStorage.removeItem('userDetailsDocId');
      await AsyncStorage.removeItem('userId');
      await AsyncStorage.removeItem('vcare_access_token');
      await AsyncStorage.removeItem('vcare_refresh_token');

      setProfile(null);
      setPosts([]);
      setIsOwnProfile(false);

      // Clear navigation history and go to Register
      navigation.reset({
        index: 0,
        routes: [{ name: 'Register' }],
      });
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to log out correctly. Please try again.');
    }
  };

  const normalizePhone = (phone) => {
    if (!phone) return '';
    // If query looks like a phone number, try direct lookup (taking last 10 digits)
    const phoneDigits = phone.toString().replace(/\D/g, '').slice(-10);
    return phoneDigits;
  };

  const loadProfile = async () => {
    try {
      setLoading(true);
      const storedPhoneNumber = await AsyncStorage.getItem('userPhoneNumber');
      const userPhoneNumber = requestedPhoneNumber || storedPhoneNumber;
      const normalizedPhone = normalizePhone(userPhoneNumber);
      if (!normalizedPhone) { setLoading(false); return; }

      try {
        const fetchedPosts = await postService.getUserPosts(normalizedPhone);
        
        // Enrich posts with author's profile photo
        const enrichedPosts = await Promise.all(
          fetchedPosts.map(async (post) => {
            let authorPhoto = null;
            try {
              if (post.authorId) {
                const userDocRef = doc(db, 'Mobile_Numbers', post.authorId, 'profile_details', 'details');
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                  const userData = userDocSnap.data();
                  authorPhoto = userData.profilePhoto || null;
                }
              }
            } catch (error) {
              console.warn('Error getting author photo for post:', post.id, error);
            }
            return { ...post, authorPhoto };
          })
        );
        
        const postsWithLikes = enrichedPosts.map((p) => ({
          ...p,
          likes: Number(p.likes || 0),
          likedByMe: Boolean(p.likedByMe || false),
        }));

        // Sort posts by Date objects (fetchedPosts already converted to Date)
        setPosts(postsWithLikes.sort((a, b) => {
          const timeA = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
          const timeB = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
          return (timeB || 0) - (timeA || 0);
        }));
      } catch (err) {
        console.error('Error fetching posts:', err);
      }

      const profileDetailsRef = doc(db, 'Mobile_Numbers', normalizedPhone, 'profile_details', 'details');
      const profileSnap = await getDoc(profileDetailsRef);

      if (profileSnap.exists()) {
        const profileData = profileSnap.data();
        const availabilityStatus = profileData.availability === 'on' ? 'on' : 'off';
        setProfile({
          _id: normalizedPhone,
          ...profileData,
          phoneNumber: profileData.phoneNumber,
          hidePhoneNumber: profileData.hidePhoneNumber || false,
          availability: availabilityStatus,
          posts: [],
          connections: [],
          followers: [],
          following: []
        });
        setIsOwnProfile(normalizedPhone === normalizePhone(storedPhoneNumber));
      } else if (normalizedPhone) {
        setProfile({
          _id: normalizedPhone,
          phoneNumber: normalizedPhone,
          hidePhoneNumber: false,
          availability: 'off',
          name: `+91 ${normalizedPhone}`,
          bloodGroup: 'Not set',
          state: 'Not set',
          city: 'Not set',
          dateOfBirth: 'Not set',
          gender: 'Not set',
          posts: [],
          connections: [],
          followers: [],
          following: []
        });
        setIsOwnProfile(normalizedPhone === normalizePhone(storedPhoneNumber));
      } else {
        setProfile(null);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const handleEditProfile = () => { if (profile) navigation.navigate('EditProfile', { profile }); };

  const toggleAvailability = async () => {
    if (!profile) return;
    const newStatus = profile.availability === 'on' ? 'off' : 'on';
    setLoading(true);
    try {
      const profileId = normalizePhone(profile._id || profile.phoneNumber);
      await updateDoc(doc(db, 'Mobile_Numbers', profileId, 'profile_details', 'details'), {
        availability: newStatus,
      });
      setProfile((prev) => ({ ...prev, availability: newStatus }));
    } catch (error) {
      console.error('Availability update failed:', error);
      Alert.alert('Error', 'Failed to update donation availability. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const saveRecentChat = async (contact) => {
    if (!contact?.id) return;
    try {
      const userId = await AsyncStorage.getItem('userId');
      const phone = await AsyncStorage.getItem('userPhoneNumber');
      const currentUserId = userId || phone;
      const storageKey = `@vcare_recent_chats_${currentUserId}`;
      
      const stored = await AsyncStorage.getItem(storageKey);
      const existing = stored ? JSON.parse(stored) : [];
      const filtered = existing.filter((c) => c.id !== contact.id);
      const now = new Date().toISOString();
      const chatEntry = {
        ...contact,
        lastMessage: contact.lastMessage || 'Tap to start a chat',
        time: contact.time || 'Now',
        updatedAt: now,
      };
      const updated = [chatEntry, ...filtered].slice(0, 20);
      await AsyncStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (err) {
      console.warn('Failed to save recent chat', err);
    }
  };

  const handleProfileChat = async () => {
    if (!profile) return;

    const normalizedPhone = normalizePhone(profile.phoneNumber);
    const contact = {
      id: normalizedPhone,
      name: profile.name || profile.username || `+91 ${normalizedPhone}`,
      avatar: profile.profilePhoto || null,
      bloodGroup: profile.bloodGroup || null,
      city: profile.city || profile.state || null,
      lastMessage: 'Tap to start a chat',
      time: 'Now',
    };

    await saveRecentChat(contact);
    navigation.navigate('ChatScreen', { contact });
  };

  const handleShareProfile = async () => {
    if (!profile) return;
    const name = profile.name || profile.username || `+91 ${profile.phoneNumber}`;
    const bloodGroup = profile.bloodGroup || 'Not set';
    const city = profile.city || profile.state || 'Not set';
    const phoneDisplay = profile.hidePhoneNumber ? 'Hidden' : `+91 ${profile.phoneNumber}`;
    const profileLink = `https://vcare-app.com/profile/${normalizePhone(profile.phoneNumber)}`;
    const message = `My V-Care profile:\nName: ${name}\nBlood Group: ${bloodGroup}\nCity: ${city}\nPhone: ${phoneDisplay}\n\nView profile: ${profileLink}`;
    try {
      await Share.share({
        title: `${name}'s V-Care profile`,
        message,
      });
    } catch (error) {
      console.error('Error sharing profile:', error);
      Alert.alert('Share failed', 'Unable to share profile. Please try again.');
    }
  };

  const handleShareUserProfile = async () => {
    if (!profile) return;
    const name = profile.name || profile.username || `+91 ${profile.phoneNumber}`;
    const bloodGroup = profile.bloodGroup || 'Not set';
    const city = profile.city || profile.state || 'Not set';
    const phoneDisplay = profile.hidePhoneNumber ? 'Hidden' : `+91 ${profile.phoneNumber}`;
    const profileLink = `https://vcare-app.com/profile/${normalizePhone(profile.phoneNumber)}`;
    const message = `Check out this V-Care profile:\nName: ${name}\nBlood Group: ${bloodGroup}\nCity: ${city}\nPhone: ${phoneDisplay}\n\nView profile: ${profileLink}`;
    try {
      await Share.share({
        title: `${name}'s V-Care profile`,
        message,
      });
    } catch (error) {
      console.error('Error sharing user profile:', error);
      Alert.alert('Share failed', 'Unable to share profile. Please try again.');
    }
  };

  const handleBlockUser = async () => {
    if (!profile) return;

    try {
      const blockedKey = '@vcare_blocked_users';
      const rawBlocked = await AsyncStorage.getItem(blockedKey);
      const blockedList = rawBlocked ? JSON.parse(rawBlocked) : [];
      const normalizedPhone = normalizePhone(profile.phoneNumber);
      if (blockedList.includes(normalizedPhone)) {
        Alert.alert('Already blocked', 'This user is already in your blocked list.');
        return;
      }
      const updated = [...blockedList, normalizedPhone];
      await AsyncStorage.setItem(blockedKey, JSON.stringify(updated));
      Alert.alert('Blocked', 'The user has been blocked successfully.');
      setMenuVisible(false);
    } catch (error) {
      console.error('Error blocking user:', error);
      Alert.alert('Error', 'Unable to block the user. Please try again.');
    }
  };

  const handleSharePost = async (item) => {
    try { await Share.share({ message: item.text || 'Check out this post on V-Care!' }); } catch (error) { console.error(error); }
  };

  const handleSavePost = (item) => { Alert.alert('Saved', 'Post saved to your collection!'); };

  const handleDeletePost = async (postId) => {
    // Web safe confirmation
    const confirmDelete = Platform.OS === 'web'
      ? window.confirm('Are you sure you want to delete this post permanently?')
      : true; // For mobile we use Alert.alert which is already called below

    const executeDeletion = async () => {
      try {
        setLoading(true);
        await postService.deletePost(postId);
        setPosts(prev => prev.filter(p => p.id !== postId));
        if (Platform.OS === 'web') alert('Post deleted permanently.');
        else Alert.alert('Success', 'Post deleted permanently.');
      } catch (error) {
        console.error('Delete error:', error);
        if (Platform.OS === 'web') alert('Failed to delete post.');
        else Alert.alert('Error', 'Failed to delete post.');
      } finally {
        setLoading(false);
      }
    };

    if (Platform.OS === 'web') {
      if (confirmDelete) await executeDeletion();
    } else {
      Alert.alert(
        'Delete Post',
        'Are you sure you want to delete this post permanently?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: executeDeletion }
        ]
      );
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator animating={true} size="large" color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.emptyContainer}>
          <Text style={{ color: theme.colors.text, fontSize: 16, marginBottom: 16 }}>No profile found. Please register first.</Text>
          <Button mode="contained" onPress={() => navigation.navigate('Register')}>Go to Register</Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]} showsVerticalScrollIndicator={false}>

        <View style={{ width: '100%', alignItems: 'flex-end', paddingRight: 4, paddingTop: 4 }}>
          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={
              <TouchableOpacity style={{ padding: 8 }} onPress={() => setMenuVisible(true)}>
                <MaterialCommunityIcons name="dots-vertical" size={24} color="#555" />
              </TouchableOpacity>
            }
          >
            {isOwnProfile && (
              <>
                <Menu.Item onPress={() => { setMenuVisible(false); handleEditProfile(); }} title="Edit Profile" />
                <Menu.Item onPress={() => { setMenuVisible(false); navigation.navigate('DonateAmount'); }} title="Donate" />
                <Menu.Item onPress={() => { setMenuVisible(false); navigation.navigate('Settings'); }} title="Settings" />
                <Divider />
                <Menu.Item onPress={() => { setMenuVisible(false); handleLogout(); }} title="Logout" />
              </>
            )}
            {!isOwnProfile && (
              <>
                <Menu.Item onPress={() => { setMenuVisible(false); handleShareUserProfile(); }} title="Share Profile" />
                <Menu.Item onPress={() => { setMenuVisible(false); handleBlockUser(); }} title="Block User" />
                <Divider />
                <Menu.Item onPress={() => { setMenuVisible(false); Alert.alert('Report', 'User reported.'); }} title="Report User" />
              </>
            )}
          </Menu>
        </View>
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            {profile.profilePhoto ? (
              <Image source={{ uri: profile.profilePhoto }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarCircle}><MaterialCommunityIcons name="account" size={54} color="#888" /></View>
            )}
          </View>

          <View style={styles.infoColumn}>
            <Text style={[styles.profileName, { color: theme.colors.text }]}>
              {profile.name || profile.username || `+91 ${profile.phoneNumber}`}
            </Text>
            <Text style={[styles.profileDetail, { color: theme.colors.text }]}>
              {profile.bloodGroup ? `Blood Group: ${profile.bloodGroup}` : 'Blood Group: Not set'}
            </Text>
            <Text style={[styles.profileDetail, { color: theme.colors.text }]}>
              {profile.city ? `City: ${profile.city}` : profile.state ? `State: ${profile.state}` : 'City: Not set'}
            </Text>
            {!profile.hidePhoneNumber && (
              <Text style={[styles.profileDetail, { color: theme.colors.text }]}>+91 {profile.phoneNumber}</Text>
            )}
            <Text style={[styles.profileBio, { color: theme.colors.text }]}>{profile.bio || 'Bio: Not set'}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
              <Text style={[styles.profileDetail, { color: profile.availability === 'on' ? '#29a745' : '#dc3545', fontWeight: '700', marginRight: 12 }]}>Donation Availability: {profile.availability === 'on' ? 'Available' : 'Not Available'}</Text>
              {isOwnProfile && (
                <Switch
                  value={profile.availability === 'on'}
                  onValueChange={toggleAvailability}
                  thumbColor={profile.availability === 'on' ? '#ffffff' : '#ffffff'}
                  trackColor={{ false: '#dc3545', true: '#29a745' }}
                />
              )}
            </View>
            <View style={styles.buttonRow}>
              {!isOwnProfile && (
                <Button 
                  mode="contained" 
                  onPress={handleProfileChat} 
                  style={{ backgroundColor: '#4CAF50', marginRight: 8 }}
                >
                  Chat
                </Button>
              )}
              {isOwnProfile && (
                <Button mode="outlined" onPress={handleShareProfile} style={styles.actionButton}>Share</Button>
              )}
            </View>
          </View>
        </View>

        <View style={styles.postsSection}>
          <Text style={styles.postsTitle}>Posts</Text>
          {posts.length > 0 ? (
            <View style={styles.feedContainer}>
              {posts.map(item => (
                <View style={styles.postCard} key={item.id}>
                  <View style={styles.postCardHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      {item.authorPhoto ? (
                        <Image source={{ uri: item.authorPhoto }} style={styles.miniAvatar} />
                      ) : (
                        <View style={styles.miniAvatar}>
                          <MaterialCommunityIcons name="account" size={18} color="#888" />
                        </View>
                      )}
                      <Text style={styles.postCardName}>{profile.name || 'User'}</Text>
                    </View>
                    {isOwnProfile && (
                      <Menu
                        visible={activePostMenu === item.id}
                        onDismiss={() => setActivePostMenu(null)}
                        anchor={
                          <TouchableOpacity onPress={() => setActivePostMenu(item.id)}>
                            <MaterialCommunityIcons name="dots-vertical" size={20} color="#657786" />
                          </TouchableOpacity>
                        }
                      >
                        <Menu.Item
                          onPress={() => {
                            setActivePostMenu(null);
                            handleDeletePost(item.id);
                          }}
                          title="Delete Post"
                          titleStyle={{ color: '#ff4444' }}
                          leadingIcon="delete"
                        />
                      </Menu>
                    )}
                  </View>
                  {item.imageUrl && (
                    <Image source={{ uri: item.imageUrl }} style={styles.postCardImage} resizeMode="contain" />
                  )}
                  {item.text && (
                    <Text style={styles.postCardText}>{item.text}</Text>
                  )}
                  <View style={styles.postCardActions}>
                    <TouchableOpacity style={styles.iconBtn} onPress={() => handleSharePost(item)}>
                      <MaterialCommunityIcons name="send-outline" size={20} color="#657786" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={{ textAlign: 'center', marginTop: 30, color: '#666' }}>No posts yet.</Text>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  scrollContent: { paddingBottom: 140 },
  profileSection: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 20, alignItems: 'flex-start' },
  avatarContainer: { marginRight: 20 },
  avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#f0f0f0' },
  avatarCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center' },
  infoColumn: { flex: 1, justifyContent: 'center' },
  profileName: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  profileDetail: { fontSize: 14, fontWeight: '500', marginBottom: 2 },
  profileBio: { fontSize: 14, fontWeight: '400', marginTop: 8, color: '#666' },
  buttonRow: { flexDirection: 'row', justifyContent: 'flex-start', flexWrap: 'wrap', marginTop: 12 },
  actionButton: { minWidth: 110, flex: 0, height: 36, justifyContent: 'center', marginRight: 8 },
  primaryActionButton: { marginRight: 8 },

  // ── Posts Section (List View) ──
  postsSection: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 16 },
  postsTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12, paddingHorizontal: 20 },
  feedContainer: { paddingHorizontal: 0 },
  postCard: {
    width: '100%',
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 0,
    marginBottom: 10,
  },
  postCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    marginBottom: 6,
  },
  miniAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  postCardName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#14171A',
  },
  postCardImage: {
    width: '100%',
    height: 320,
    backgroundColor: '#f9f9f9',
    marginVertical: 0,
  },
  postCardText: {
    fontSize: 15,
    color: '#14171A',
    lineHeight: 22,
    paddingHorizontal: 18,
    marginTop: 8,
  },
  postCardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    marginTop: 8,
  },
  iconBtn: { padding: 8 },

  // (Remaining styles reused or removed)
  dropdownContainer: { position: 'relative', zIndex: 10 },
  dropdownButton: { flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderColor: '#ff6b6b', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#fff', justifyContent: 'space-between' },
  dropdownButtonActive: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  dropdownButtonText: { fontSize: 16, fontWeight: '600', color: '#333', flex: 1 },
  placeholderText: { color: '#bbb' },
  dropdownList: { borderWidth: 2, borderTopWidth: 0, borderColor: '#ff6b6b', borderBottomLeftRadius: 14, borderBottomRightRadius: 14, backgroundColor: '#fff', maxHeight: 200 },
  dropdownItem: { paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#eee' },
  dropdownItemText: { fontSize: 15, color: '#666', fontWeight: '500' },
  dropdownItemSelected: { color: '#ff6b6b', fontWeight: '700' },
});
