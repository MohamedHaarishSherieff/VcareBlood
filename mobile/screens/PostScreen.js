import React, { useState, useCallback, useContext } from 'react';
import { LanguageContext } from '../context/LanguageContext';
import { useTheme, Menu, Divider } from 'react-native-paper';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  ActivityIndicator,
  FlatList,
  Share,
  Modal,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import postService from '../services/postService';
import { db, authentication } from '../firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { useTabBar } from '../context/TabBarContext';

const normalizePhone = (phone) => {
  if (!phone) return '';
  return phone.toString().replace(/\D/g, '').slice(-10);
};

const formatTimeAgo = (dateInput) => {
  if (!dateInput) return 'Just now';
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) return 'Recently';

  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

export default function PostScreen({ route, navigation }) {
  const { handleScroll } = useTabBar();
  const { t } = useContext(LanguageContext);
  const [postText, setPostText] = useState('');
  const [postImage, setPostImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState('');
  const [userPhoto, setUserPhoto] = useState(null);
  const [userBloodGroup, setUserBloodGroup] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(null);
  const [feed, setFeed] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null);
  const [userPhone, setUserPhone] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState(null);
  const [imagePickerMenuVisible, setImagePickerMenuVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      const run = async () => {
        const phone = await AsyncStorage.getItem('userPhoneNumber');
        const userId = await AsyncStorage.getItem('userId');
        const accessToken = await AsyncStorage.getItem('vcare_access_token');
        const loggedIn = !!phone || !!userId || !!accessToken;

        if (isMounted) {
          setIsLoggedIn(loggedIn);
          setUserPhone(normalizePhone(phone || userId));
        }

        // Allow guests and donors to load feed freely without popup alerts
        try {
          if (!authentication?.currentUser) {
            await signInAnonymously(authentication);
          }
        } catch (authError) {
          console.warn('Anonymous sign-in for posts skipped:', authError);
        }

        if (isMounted) {
          await loadUserInfo();
          await loadFeed();
        }
      };

      run();
      return () => { isMounted = false; };
    }, [navigation])
  );

  const loadUserInfo = async () => {
    try {
      const phone = await AsyncStorage.getItem('userPhoneNumber');
      const userId = await AsyncStorage.getItem('userId');
      const rawId = phone || userId;
      const cleanPhone = normalizePhone(rawId);

      if (cleanPhone) {
        const docRef = doc(db, 'Mobile_Numbers', cleanPhone, 'profile_details', 'details');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.name) setUserName(data.name);
          if (data.profilePhoto) setUserPhoto(data.profilePhoto);
          if (data.bloodGroup) setUserBloodGroup(data.bloodGroup);
        }
      }
    } catch (error) {
      console.error('Error loading user info for post screen:', error);
    }
  };

  const loadFeed = async () => {
    try {
      const feedData = await postService.getFeed();
      const storedPhone = await AsyncStorage.getItem('userPhoneNumber');
      const storedUserId = await AsyncStorage.getItem('userId');
      const myId = normalizePhone(storedPhone || storedUserId);

      const enrichedFeed = await Promise.all(
        feedData.map(async (post) => {
          let authorPhoto = null;
          let authorName = post.authorName;

          try {
            const cleanAuthorId = normalizePhone(post.authorId);
            if (cleanAuthorId) {
              const userDocRef = doc(db, 'Mobile_Numbers', cleanAuthorId, 'profile_details', 'details');
              const userDocSnap = await getDoc(userDocRef);
              if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                if (userData.profilePhoto) authorPhoto = userData.profilePhoto;
                if (userData.name) authorName = userData.name;
              }
            }
          } catch (error) {
            console.warn('Error getting author info for post:', post.id, error);
          }

          const likedBy = Array.isArray(post.likedBy) ? post.likedBy : [];
          const isLiked = myId ? (likedBy.includes(myId) || likedBy.includes(storedPhone)) : false;

          return {
            ...post,
            authorPhoto,
            authorName: (authorName && authorName !== 'Your Name') ? authorName : 'V-Care User',
            likes: Number(post.likes || 0),
            isLiked,
          };
        })
      );
      setFeed(enrichedFeed);
    } catch (err) {
      console.error('Error loading feed:', err);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadFeed();
    } catch (err) {
      console.error('Error refreshing feed:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const pickImageFromGallery = async () => {
    setImagePickerMenuVisible(false);
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Denied', 'Please grant photo library access to upload photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const imageBase64 = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        setPostImage(imageBase64);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image from gallery.');
    }
  };

  const takePhotoWithCamera = async () => {
    setImagePickerMenuVisible(false);
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Denied', 'Please grant camera access to take a photo.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const imageBase64 = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        setPostImage(imageBase64);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo with camera.');
    }
  };

  const handlePost = async () => {
    if (!postText.trim() && !postImage) {
      Alert.alert('Empty Post', 'Please write something or attach a photo before posting.');
      return;
    }
    setLoading(true);
    try {
      const storedPhone = await AsyncStorage.getItem('userPhoneNumber');
      const storedUserId = await AsyncStorage.getItem('userId');
      const authorId = normalizePhone(storedPhone || storedUserId) || storedUserId || storedPhone;

      if (!authorId) {
        Alert.alert('Error', 'Please log in to create a post.');
        return;
      }

      let currentUserName = userName;
      if (!currentUserName || currentUserName === 'Your Name') {
        const cleanPhone = normalizePhone(storedPhone);
        if (cleanPhone) {
          const docRef = doc(db, 'Mobile_Numbers', cleanPhone, 'profile_details', 'details');
          const docSnap = await getDoc(docRef);
          if (docSnap.exists() && docSnap.data().name) {
            currentUserName = docSnap.data().name;
            setUserName(currentUserName);
          }
        }
      }

      const newPost = await postService.createPost({
        authorId,
        authorName: currentUserName || 'V-Care Donor',
        title: '',
        text: postText.trim(),
        imageBase64: postImage,
      });

      setPostText('');
      setPostImage(null);
      setModalVisible(false);

      // Re-fetch feed to ensure latest data & author info are fresh
      await loadFeed();
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert('Post Failed', 'Failed to create post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLike = async (item) => {
    try {
      const storedPhone = await AsyncStorage.getItem('userPhoneNumber');
      const storedUserId = await AsyncStorage.getItem('userId');
      const myId = normalizePhone(storedPhone || storedUserId);

      if (!myId) {
        Alert.alert('Login Required', 'Please log in to like posts.');
        return;
      }

      // Optimistic update
      setFeed(prevFeed =>
        prevFeed.map(p => {
          if (p.id === item.id) {
            const wasLiked = p.isLiked;
            const newLikes = wasLiked ? Math.max(0, p.likes - 1) : p.likes + 1;
            return { ...p, isLiked: !wasLiked, likes: newLikes };
          }
          return p;
        })
      );

      await postService.toggleLikePost(item.id, myId);
    } catch (err) {
      console.error('Error toggling like:', err);
      // Revert if error
      await loadFeed();
    }
  };

  const handleShare = async (item) => {
    try {
      const shareMessage = item.text
        ? `${item.authorName || 'V-Care User'}: "${item.text}"\n\nShared via V-Care Blood Donation App`
        : `Check out this post by ${item.authorName || 'V-Care User'} on V-Care!`;
      await Share.share({ message: shareMessage });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleChat = (item) => {
    if (!item?.authorId) {
      Alert.alert('Error', 'Unable to open chat for this post author.');
      return;
    }

    const cleanAuthorId = normalizePhone(item.authorId);
    navigation.navigate('ChatScreen', {
      contact: {
        id: cleanAuthorId || item.authorId,
        name: item.authorName || 'V-Care Donor',
        avatar: item.authorPhoto || null,
      },
    });
  };

  const handleViewProfile = (authorId) => {
    if (!authorId) return;
    const cleanPhone = normalizePhone(authorId);
    navigation.navigate('UserProfile', { phoneNumber: cleanPhone || authorId });
  };

  const handleReportPost = (postId) => {
    if (Platform.OS === 'web') {
      alert('Post reported to moderators. Thank you for keeping V-Care safe.');
    } else {
      Alert.alert('Report Submitted', 'Thank you for reporting. Our moderation team will review this post.');
    }
  };

  const handleDeletePost = async (postId) => {
    const executeDeletion = async () => {
      try {
        setLoading(true);
        await postService.deletePost(postId);
        setFeed(prev => prev.filter(p => p.id !== postId));
        if (Platform.OS === 'web') alert('Post deleted successfully.');
        else Alert.alert('Success', 'Your post has been deleted.');
      } catch (error) {
        console.error('Delete error:', error);
        if (Platform.OS === 'web') alert('Failed to delete post.');
        else Alert.alert('Error', 'Failed to delete post. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to delete this post permanently?')) {
        await executeDeletion();
      }
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

  const renderPostItem = ({ item }) => {
    const isMyPost = userPhone && (userPhone === normalizePhone(item.authorId) || userPhone === item.authorId);

    return (
      <View style={styles.postCard}>
        {/* Header */}
        <View style={styles.postHeader}>
          <TouchableOpacity
            style={styles.postHeaderLeft}
            onPress={() => handleViewProfile(item.authorId)}
            activeOpacity={0.8}
          >
            {item.authorPhoto ? (
              <Image source={{ uri: item.authorPhoto }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <MaterialCommunityIcons name="account" size={22} color="#64748B" />
              </View>
            )}
            <View style={styles.authorMeta}>
              <Text style={styles.authorNameText}>{item.authorName}</Text>
              <Text style={styles.postTimeText}>{formatTimeAgo(item.createdAt)}</Text>
            </View>
          </TouchableOpacity>

          <Menu
            visible={activeMenu === item.id}
            onDismiss={() => setActiveMenu(null)}
            anchor={
              <TouchableOpacity style={styles.menuDotBtn} onPress={() => setActiveMenu(item.id)}>
                <MaterialCommunityIcons name="dots-vertical" size={20} color="#64748B" />
              </TouchableOpacity>
            }
          >
            <Menu.Item
              onPress={() => {
                setActiveMenu(null);
                handleViewProfile(item.authorId);
              }}
              title="View Profile"
              leadingIcon="account"
            />
            <Menu.Item
              onPress={() => {
                setActiveMenu(null);
                handleReportPost(item.id);
              }}
              title="Report Post"
              titleStyle={{ color: '#D32F2F' }}
              leadingIcon="flag"
            />
            {isMyPost && (
              <>
                <Divider />
                <Menu.Item
                  onPress={() => {
                    setActiveMenu(null);
                    handleDeletePost(item.id);
                  }}
                  title="Delete Post"
                  titleStyle={{ color: '#D32F2F', fontWeight: '700' }}
                  leadingIcon="delete"
                />
              </>
            )}
          </Menu>
        </View>

        {/* Text Content */}
        {item.text ? <Text style={styles.postBodyText}>{item.text}</Text> : null}

        {/* Image Content */}
        {item.imageUrl ? (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setPreviewImageUrl(item.imageUrl)}
            style={styles.postImageContainer}
          >
            <Image source={{ uri: item.imageUrl }} style={styles.postImage} resizeMode="cover" />
          </TouchableOpacity>
        ) : null}

        {/* Action Row */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleToggleLike(item)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name={item.isLiked ? 'heart' : 'heart-outline'}
              size={22}
              color={item.isLiked ? '#D32F2F' : '#64748B'}
            />
            <Text style={[styles.actionText, item.isLiked && styles.actionTextLiked]}>
              {item.likes > 0 ? item.likes : 'Like'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleChat(item)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="chat-outline" size={22} color="#64748B" />
            <Text style={styles.actionText}>Chat</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleShare(item)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="share-variant-outline" size={20} color="#64748B" />
            <Text style={styles.actionText}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (isLoggedIn === null) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#D32F2F" />
      </SafeAreaView>
    );
  }

  if (!isLoggedIn) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <MaterialCommunityIcons name="account-lock-outline" size={64} color="#CBD5E1" />
        <Text style={styles.loginReqTitle}>Login Required</Text>
        <Text style={styles.loginReqSubtitle}>
          Please register or log in as a donor to access community posts and blood requests.
        </Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('Register')}
          style={styles.primaryBtn}
        >
          <Text style={styles.primaryBtnText}>Register / Login</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Modern App Top Header */}
      <View style={styles.topNavHeader}>
        <View style={styles.navTitleRow}>
          <View style={styles.logoBadge}>
            <MaterialCommunityIcons name="water" size={20} color="#FFFFFF" />
          </View>
          <Text style={styles.navTitle}>V-Care Community</Text>
        </View>
        <View style={styles.navActions}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={onRefresh}
            disabled={refreshing}
          >
            <MaterialCommunityIcons name="refresh" size={22} color="#0F172A" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.createPostNavBtn}
            onPress={() => setModalVisible(true)}
          >
            <MaterialCommunityIcons name="plus" size={20} color="#FFFFFF" />
            <Text style={styles.createPostNavText}>Post</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Image Full-Screen Preview Modal */}
      <Modal
        visible={!!previewImageUrl}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPreviewImageUrl(null)}
      >
        <View style={styles.fullScreenModalBg}>
          <TouchableOpacity
            style={styles.fullScreenCloseBtn}
            onPress={() => setPreviewImageUrl(null)}
          >
            <MaterialCommunityIcons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          {previewImageUrl ? (
            <Image
              source={{ uri: previewImageUrl }}
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
          ) : null}
        </View>
      </Modal>

      {/* Create Post Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  setPostText('');
                  setPostImage(null);
                }}
                style={styles.modalCancelBtn}
              >
                <MaterialCommunityIcons name="close" size={24} color="#0F172A" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Create Post</Text>
              <TouchableOpacity
                style={[
                  styles.modalSubmitBtn,
                  (postText.trim() || postImage) && styles.modalSubmitBtnActive,
                ]}
                onPress={handlePost}
                disabled={(!postText.trim() && !postImage) || loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Publish</Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.composeUserHeader}>
              {userPhoto ? (
                <Image source={{ uri: userPhoto }} style={styles.composeUserAvatar} />
              ) : (
                <View style={styles.composeUserAvatarPlaceholder}>
                  <MaterialCommunityIcons name="account" size={24} color="#64748B" />
                </View>
              )}
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.composeUserName}>{userName || 'V-Care Member'}</Text>
                {userBloodGroup ? (
                  <View style={styles.composeBloodPill}>
                    <MaterialCommunityIcons name="water" size={12} color="#D32F2F" />
                    <Text style={styles.composeBloodText}>{userBloodGroup}</Text>
                  </View>
                ) : null}
              </View>
            </View>

            <View style={styles.composeInputWrap}>
              <TextInput
                style={styles.composeTextInput}
                multiline
                placeholder="Share a blood request, donation update, or message with the community..."
                placeholderTextColor="#94A3B8"
                value={postText}
                onChangeText={setPostText}
                maxLength={5000}
                autoFocus
              />
            </View>

            {postImage ? (
              <View style={styles.imagePreviewWrap}>
                <Image source={{ uri: postImage }} style={styles.imagePreview} resizeMode="cover" />
                <TouchableOpacity
                  style={styles.removeImageBtn}
                  onPress={() => setPostImage(null)}
                >
                  <MaterialCommunityIcons name="close-circle" size={28} color="#D32F2F" />
                </TouchableOpacity>
              </View>
            ) : null}

            {/* Bottom Toolbar for image attachment */}
            <View style={styles.modalFooterToolbar}>
              <Text style={styles.toolbarTitle}>Add to your post:</Text>
              <View style={styles.toolbarActions}>
                <TouchableOpacity
                  style={styles.toolbarOptionBtn}
                  onPress={pickImageFromGallery}
                >
                  <MaterialCommunityIcons name="image-plus" size={24} color="#2563EB" />
                  <Text style={styles.toolbarOptionText}>Gallery</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.toolbarOptionBtn}
                  onPress={takePhotoWithCamera}
                >
                  <MaterialCommunityIcons name="camera" size={24} color="#059669" />
                  <Text style={styles.toolbarOptionText}>Camera</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Main Feed List */}
      <FlatList
        data={feed}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        keyExtractor={(item) => item.id}
        renderItem={renderPostItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#D32F2F']}
            tintColor="#D32F2F"
          />
        }
        ListHeaderComponent={
          <TouchableOpacity
            style={styles.composeTriggerCard}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.85}
          >
            <View style={styles.triggerAvatar}>
              {userPhoto ? (
                <Image source={{ uri: userPhoto }} style={styles.triggerAvatarImg} />
              ) : (
                <MaterialCommunityIcons name="account" size={22} color="#64748B" />
              )}
            </View>
            <Text style={styles.triggerPlaceholderText}>
              Share a post or blood request...
            </Text>
            <View style={styles.triggerIconWrap}>
              <MaterialCommunityIcons name="image-plus" size={22} color="#D32F2F" />
            </View>
          </TouchableOpacity>
        }
        contentContainerStyle={styles.feedListContainer}
        ListEmptyComponent={() => (
          <View style={styles.emptyFeedState}>
            <MaterialCommunityIcons name="post-outline" size={60} color="#CBD5E1" />
            <Text style={styles.emptyFeedTitle}>No Posts Yet</Text>
            <Text style={styles.emptyFeedSubtitle}>
              Be the first to share an update, urgent blood requirement, or message with the community!
            </Text>
            <TouchableOpacity
              style={styles.emptyFeedBtn}
              onPress={() => setModalVisible(true)}
            >
              <Text style={styles.emptyFeedBtnText}>Create a Post</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },

  // Top Nav Header
  topNavHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  navTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#D32F2F',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  navTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  navActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
  },
  createPostNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D32F2F',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
  },
  createPostNavText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
    marginLeft: 4,
  },

  // Feed List
  feedListContainer: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 110,
  },
  composeTriggerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    elevation: 1,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
  },
  triggerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  triggerAvatarImg: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  triggerPlaceholderText: {
    fontSize: 14,
    color: '#64748B',
    flex: 1,
  },
  triggerIconWrap: {
    padding: 6,
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
  },

  // Post Card
  postCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  postHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorMeta: {
    marginLeft: 12,
    justifyContent: 'center',
  },
  authorNameText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  postTimeText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  menuDotBtn: {
    padding: 6,
  },
  postBodyText: {
    fontSize: 15,
    color: '#334155',
    lineHeight: 22,
    marginBottom: 12,
  },
  postImageContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: '#F8FAFC',
  },
  postImage: {
    width: '100%',
    height: 240,
    borderRadius: 16,
  },

  // Action Row
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
    marginTop: 4,
    justifyContent: 'space-around',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginLeft: 6,
  },
  actionTextLiked: {
    color: '#D32F2F',
  },

  // Empty State
  emptyFeedState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyFeedTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 14,
  },
  emptyFeedSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  emptyFeedBtn: {
    backgroundColor: '#D32F2F',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 14,
    marginTop: 20,
  },
  emptyFeedBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },

  // Login Required
  loginReqTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 16,
  },
  loginReqSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
    lineHeight: 20,
  },
  primaryBtn: {
    backgroundColor: '#D32F2F',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },

  // Create Post Modal
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalCancelBtn: {
    padding: 6,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalSubmitBtn: {
    backgroundColor: '#FFCDD2',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 14,
  },
  modalSubmitBtnActive: {
    backgroundColor: '#D32F2F',
  },
  modalSubmitBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  composeUserHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  composeUserAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  composeUserAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  composeUserName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  composeBloodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  composeBloodText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D32F2F',
    marginLeft: 3,
  },
  composeInputWrap: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  composeTextInput: {
    fontSize: 16,
    color: '#0F172A',
    lineHeight: 24,
    textAlignVertical: 'top',
    flex: 1,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  imagePreviewWrap: {
    marginHorizontal: 16,
    marginBottom: 16,
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 16,
  },
  removeImageBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
  },
  modalFooterToolbar: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
  },
  toolbarTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 10,
  },
  toolbarActions: {
    flexDirection: 'row',
    gap: 12,
  },
  toolbarOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
  },
  toolbarOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginLeft: 8,
  },

  // Full Screen Image Viewer Modal
  fullScreenModalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenCloseBtn: {
    position: 'absolute',
    top: 48,
    right: 20,
    zIndex: 10,
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
  },
  fullScreenImage: {
    width: '100%',
    height: '80%',
  },
});