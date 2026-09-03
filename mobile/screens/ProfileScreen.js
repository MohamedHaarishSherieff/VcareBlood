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
import { useTabBar } from '../context/TabBarContext';

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
  const { handleScroll } = useTabBar();
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
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom', 'left', 'right']}>
        <ActivityIndicator animating={true} size="large" color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom', 'left', 'right']}>
        <View style={styles.emptyContainer}>
          <Text style={{ color: theme.colors.text, fontSize: 16, marginBottom: 16 }}>No profile found. Please register first.</Text>
          <Button mode="contained" onPress={() => navigation.navigate('Register')}>Go to Register</Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#F8FAFC' }]} edges={['bottom', 'left', 'right']}>
      <ScrollView
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
      >

        <View style={{ width: '100%', alignItems: 'flex-end', paddingRight: 16, paddingTop: 8 }}>
          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={
              <TouchableOpacity style={styles.menuIconCircle} onPress={() => setMenuVisible(true)}>
                <MaterialCommunityIcons name="dots-vertical" size={22} color="#0F172A" />
              </TouchableOpacity>
            }
          >
            {isOwnProfile && (
              <>
                <Menu.Item onPress={() => { setMenuVisible(false); handleEditProfile(); }} title="Edit Profile" />
                <Menu.Item onPress={() => { setMenuVisible(false); navigation.navigate('DonateAmount'); }} title="Donate" />
                <Menu.Item onPress={() => { setMenuVisible(false); navigation.navigate('Settings'); }} title="Settings" />
                <Divider style={{ backgroundColor: '#F1F5F9' }} />
                <Menu.Item onPress={() => { setMenuVisible(false); handleLogout(); }} title="Logout" titleStyle={{ color: '#D32F2F', fontWeight: '700' }} />
              </>
            )}
            {!isOwnProfile && (
              <>
                <Menu.Item onPress={() => { setMenuVisible(false); handleShareUserProfile(); }} title="Share Profile" />
                <Menu.Item onPress={() => { setMenuVisible(false); handleBlockUser(); }} title="Block User" />
                <Divider style={{ backgroundColor: '#F1F5F9' }} />
                <Menu.Item onPress={() => { setMenuVisible(false); Alert.alert('Report', 'User reported.'); }} title="Report User" titleStyle={{ color: '#D32F2F' }} />
              </>
            )}
          </Menu>
        </View>

        {/* Profile Glass Card */}
        <View style={styles.profileGlassCard}>
          <View style={styles.profileSection}>
            <View style={styles.avatarContainer}>
              {profile.profilePhoto ? (
                <Image source={{ uri: profile.profilePhoto }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarCircle}>
                  <MaterialCommunityIcons name="account" size={54} color="#64748B" />
                </View>
              )}
            </View>

            <View style={styles.infoColumn}>
              <Text style={styles.profileName}>
                {profile.name || profile.username || `+91 ${profile.phoneNumber}`}
              </Text>
              
              <View style={styles.bloodBadgeRow}>
                <MaterialCommunityIcons name="water" size={14} color="#D32F2F" />
                <Text style={styles.bloodBadgeText}>
                  {profile.bloodGroup ? profile.bloodGroup : 'Not set'}
                </Text>
              </View>

              <View style={styles.locationRow}>
                <MaterialCommunityIcons name="map-marker-outline" size={14} color="#64748B" />
                <Text style={styles.locationText}>
                  {profile.city ? `${profile.city}, ${profile.state}` : profile.state ? profile.state : 'Location unset'}
                </Text>
              </View>

              {!profile.hidePhoneNumber && (
                <Text style={styles.phoneText}>+91 {profile.phoneNumber}</Text>
              )}
              
              {profile.bio && <Text style={styles.profileBio}>{profile.bio}</Text>}

              <View style={styles.availabilityRow}>
                <View style={[
                  styles.statusPill,
                  { backgroundColor: profile.availability === 'on' ? '#ECFDF5' : '#FFEBEE' }
                ]}>
                  <View style={[
                    styles.statusDot,
                    { backgroundColor: profile.availability === 'on' ? '#10B981' : '#D32F2F' }
                  ]} />
                  <Text style={[
                    styles.statusPillText,
                    { color: profile.availability === 'on' ? '#047857' : '#D32F2F' }
                  ]}>
                    {profile.availability === 'on' ? 'Available to Donate' : 'Unavailable'}
                  </Text>
                </View>
                {isOwnProfile && (
                  <Switch
                    value={profile.availability === 'on'}
                    onValueChange={toggleAvailability}
                    thumbColor="#FFFFFF"
                    trackColor={{ false: '#CBD5E1', true: '#10B981' }}
                  />
                )}
              </View>

              <View style={styles.buttonRow}>
                {!isOwnProfile && (
                  <TouchableOpacity 
                    style={styles.chatButton}
                    onPress={handleProfileChat}
                  >
                    <MaterialCommunityIcons name="chat" size={18} color="#FFFFFF" />
                    <Text style={styles.chatButtonText}>Direct Chat</Text>
                  </TouchableOpacity>
                )}
                {isOwnProfile && (
                  <TouchableOpacity style={styles.actionButton} onPress={handleShareProfile}>
                    <MaterialCommunityIcons name="share-variant-outline" size={18} color="#1E3A8A" />
                    <Text style={styles.actionButtonText}>Share Profile</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </View>

        <View style={styles.postsSection}>
          <Text style={styles.postsTitle}>User Posts</Text>
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
                          <MaterialCommunityIcons name="account" size={18} color="#64748B" />
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
                            <MaterialCommunityIcons name="dots-vertical" size={20} color="#64748B" />
                          </TouchableOpacity>
                        }
                      >
                        <Menu.Item
                          onPress={() => {
                            setActivePostMenu(null);
                            handleDeletePost(item.id);
                          }}
                          title="Delete Post"
                          titleStyle={{ color: '#D32F2F', fontWeight: '700' }}
                          leadingIcon="delete"
                        />
                      </Menu>
                    )}
                  </View>
                  {item.imageUrl && (
                    <Image source={{ uri: item.imageUrl }} style={styles.postCardImage} resizeMode="cover" />
                  )}
                  {item.text && (
                    <Text style={styles.postCardText}>{item.text}</Text>
                  )}
                  <View style={styles.postCardActions}>
                    <TouchableOpacity style={styles.iconBtn} onPress={() => handleSharePost(item)}>
                      <MaterialCommunityIcons name="share-variant-outline" size={20} color="#64748B" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyPostsContainer}>
              <MaterialCommunityIcons name="post-outline" size={48} color="#CBD5E1" />
              <Text style={{ textAlign: 'center', marginTop: 12, color: '#64748B', fontSize: 14 }}>No posts published yet.</Text>
            </View>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  scrollContent: { paddingBottom: 120 },
  menuIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  profileGlassCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    marginHorizontal: 16,
    marginTop: 8,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
  },
  profileSection: { flexDirection: 'row', alignItems: 'flex-start' },
  avatarContainer: { marginRight: 16 },
  avatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#F1F5F9' },
  avatarCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  infoColumn: { flex: 1, justifyContent: 'center' },
  profileName: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  bloodBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 6,
  },
  bloodBadgeText: { fontSize: 12, fontWeight: '700', color: '#D32F2F', marginLeft: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  locationText: { fontSize: 13, color: '#64748B', marginLeft: 4 },
  phoneText: { fontSize: 13, fontWeight: '600', color: '#0F172A', marginBottom: 4 },
  profileBio: { fontSize: 13, fontWeight: '400', marginTop: 4, color: '#475569', lineHeight: 18 },
  availabilityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4, marginRight: 6 },
  statusPillText: { fontSize: 11, fontWeight: '700' },
  buttonRow: { flexDirection: 'row', justifyContent: 'flex-start', flexWrap: 'wrap', marginTop: 16 },
  chatButton: {
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginRight: 8,
  },
  chatButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700', marginLeft: 6 },
  actionButton: {
    backgroundColor: '#EFF6FF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  actionButtonText: { color: '#1E3A8A', fontSize: 13, fontWeight: '700', marginLeft: 6 },

  postsSection: { marginTop: 24, paddingHorizontal: 16 },
  postsTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 14 },
  feedContainer: {},
  postCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 1,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
  },
  postCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  miniAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  postCardName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  postCardImage: {
    width: '100%',
    height: 240,
    borderRadius: 14,
    marginVertical: 8,
  },
  postCardText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
    marginTop: 4,
  },
  postCardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  iconBtn: { padding: 4 },
  emptyPostsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },

  dropdownContainer: { position: 'relative', zIndex: 10 },
  dropdownButton: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#D32F2F', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#FFF', justifyContent: 'space-between' },
  dropdownButtonActive: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  dropdownButtonText: { fontSize: 15, fontWeight: '600', color: '#0F172A', flex: 1 },
  placeholderText: { color: '#94A3B8' },
  dropdownList: { borderWidth: 1.5, borderTopWidth: 0, borderColor: '#D32F2F', borderBottomLeftRadius: 14, borderBottomRightRadius: 14, backgroundColor: '#FFF', maxHeight: 200 },
  dropdownItem: { paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  dropdownItemText: { fontSize: 14, color: '#475569', fontWeight: '500' },
  dropdownItemSelected: { color: '#D32F2F', fontWeight: '700' },
});
