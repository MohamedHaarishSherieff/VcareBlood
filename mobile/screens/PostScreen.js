import React, { useState } from 'react';
import { useTheme, Menu, Divider } from 'react-native-paper';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
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
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import postService from '../services/postService';
import { db, authentication } from '../firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';

export default function PostScreen({ route, navigation }) {
  const [postText, setPostText] = useState('');
  const [postImage, setPostImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState('');
  const [userPhoto, setUserPhoto] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(null);
  const [feed, setFeed] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null);
  const [userPhone, setUserPhone] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      const run = async () => {
        const phone = await AsyncStorage.getItem('userPhoneNumber');
        const userId = await AsyncStorage.getItem('userId');
        const accessToken = await AsyncStorage.getItem('vcare_access_token');
        const loggedIn = !!phone || !!userId || !!accessToken;
        setIsLoggedIn(loggedIn);
        setUserPhone(phone || userId);

        if (!loggedIn) {
          Alert.alert('Login Required', 'Please register/login as a donor to access posts.', [
            { text: 'OK', onPress: () => navigation.navigate('Register') }
          ]);
          return;
        }

        try {
          if (!authentication?.currentUser) {
            await signInAnonymously(authentication);
          }
        } catch (authError) {
          console.warn('Anonymous sign-in failed for posts:', authError);
        }

        await loadUserInfo();
        await loadFeed();
      };

      run();
    }, [navigation])
  );

  const loadUserInfo = async () => {
    try {
      const phone = await AsyncStorage.getItem('userPhoneNumber');
      if (phone) {
        const docRef = doc(db, 'Mobile_Numbers', phone, 'profile_details', 'details');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.name) setUserName(data.name);
          if (data.profilePhoto) setUserPhoto(data.profilePhoto);
        }
      }
    } catch (error) {
      console.error('Error loading user info:', error);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
        base64: true,
      });
      if (!result.canceled && result.assets && result.assets[0]) {
        const imageBase64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setPostImage(imageBase64);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const loadFeed = async () => {
    try {
      const feedData = await postService.getFeed();
      const enrichedFeed = await Promise.all(
        feedData.map(async (post) => {
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

  const handlePost = async () => {
    if (!postText.trim() && !postImage) {
      Alert.alert('Error', 'Please add some text or an image');
      return;
    }
    setLoading(true);
    try {
      const storedPhone = await AsyncStorage.getItem('userPhoneNumber');
      const storedUserId = await AsyncStorage.getItem('userId');
      const authorId = storedUserId || storedPhone;
      if (!authorId) {
        Alert.alert('Error', 'Please log in to create a post');
        return;
      }

      let currentUserName = userName;
      if (!currentUserName || currentUserName === 'Your Name') {
        const docRef = doc(db, 'Mobile_Numbers', storedPhone, 'profile_details', 'details');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().name) {
          currentUserName = docSnap.data().name;
          setUserName(currentUserName);
        }
      }

      const newPost = await postService.createPost({
        authorId,
        authorName: currentUserName,
        title: '',
        text: postText.trim(),
        imageBase64: postImage,
      });

      setPostText('');
      setPostImage(null);
      setModalVisible(false);
      setFeed(prev => [newPost, ...prev]);
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert('Error', 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async (item) => {
    try {
      await Share.share({ message: item.text || 'Check out this post on V-Care!' });
    } catch (error) {
      console.error(error);
    }
  };

  const handleChat = (item) => {
    if (!item?.authorId) {
      Alert.alert('Error', 'Unable to open chat for this post author.');
      return;
    }

    navigation.navigate('ChatScreen', {
      contact: {
        id: item.authorId,
        name: item.authorName || 'Unknown',
        avatar: item.authorPhoto || item.authorPhotoUrl || null,
      },
    });
  };

  const handleSave = (item) => {
    Alert.alert('Saved', 'Post saved to your collection!');
  };

  const handleViewProfile = (phoneNumber) => {
    if (!phoneNumber) return;
    navigation.navigate('UserProfile', { phoneNumber });
  };

  const handleReportPost = (postId) => {
    if (Platform.OS === 'web') {
      alert('Post reported. Thank you for keeping V-Care safe.');
    } else {
      Alert.alert('Reported', 'Post reported. Thank you for keeping V-Care safe.');
    }
  };

  const handleDeletePost = async (postId) => {
    const confirmDelete = Platform.OS === 'web' 
      ? window.confirm('Are you sure you want to delete this post permanently?')
      : true;

    const executeDeletion = async () => {
      try {
        setLoading(true);
        await postService.deletePost(postId);
        setFeed(prev => prev.filter(p => p.id !== postId));
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

  const renderPostItem = ({ item }) => (
    <View style={styles.postContainer}>
      <View style={styles.postHeader}>
        <TouchableOpacity
          style={styles.postHeaderLeft}
          onPress={() => navigation.navigate('UserProfile', { phoneNumber: item.authorId })}
        >
          {item.authorPhoto ? (
            <Image source={{ uri: item.authorPhoto }} style={[styles.postAvatarCircle, { borderWidth: 0 }]} />
          ) : (
            <View style={styles.postAvatarCircle}>
              <MaterialCommunityIcons name="account" size={22} color="#888" />
            </View>
          )}
          <Text style={styles.postHeaderName}>
            {(item.authorName && item.authorName !== 'Your Name') ? item.authorName : 'Anonymous'}
          </Text>
        </TouchableOpacity>
        <Menu
          visible={activeMenu === item.id}
          onDismiss={() => setActiveMenu(null)}
          anchor={
            <TouchableOpacity style={styles.iconBtn} onPress={() => setActiveMenu(item.id)}>
              <MaterialCommunityIcons name="dots-vertical" size={20} color="#555" />
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
            titleStyle={{ color: 'rgb(211, 16, 16)' }}
            leadingIcon="flag"
          />
          {userPhone === item.authorId && (
            <>
              <Divider />
              <Menu.Item 
                onPress={() => {
                  setActiveMenu(null);
                  handleDeletePost(item.id);
                }} 
                title="Delete Post" 
                titleStyle={{ color: '#ff4444' }}
                leadingIcon="delete"
              />
            </>
          )}
        </Menu>
      </View>
      {item.imageUrl && (
        <Image source={{ uri: item.imageUrl }} style={styles.fullWidthImage} resizeMode="contain" />
      )}
      {item.text && <Text style={styles.postTextBody}>{item.text}</Text>}
      <View style={styles.postActionsRow}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => handleChat(item)}>
          <MaterialCommunityIcons name="chat-outline" size={22} color="#657786" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={() => handleShare(item)}>
          <MaterialCommunityIcons name="send-outline" size={22} color="#657786" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (isLoggedIn === null) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="rgb(211, 16, 16)" />      </SafeAreaView>
    );
  }
  if (!isLoggedIn) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ fontSize: 18, marginBottom: 20, textAlign: 'center' }}>
          Please register as a donor to access posts.
        </Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('Register')}
          style={{ backgroundColor: 'rgb(211, 16, 16)', padding: 12, borderRadius: 8 }}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>Register Now</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Create Post Modal Inlined ── */}
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
              <TouchableOpacity onPress={() => { setModalVisible(false); setPostText(''); setPostImage(null); }} style={styles.cancelBtn}>
                <MaterialCommunityIcons name="close" size={24} color="#14171A" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.postBtn, (postText.trim() || postImage) && styles.postBtnActive]}
                onPress={handlePost}
                disabled={(!postText.trim() && !postImage) || loading}
              >
                {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.postBtnText}>Post</Text>}
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.composeAvatar}>
                {userPhoto ? <Image source={{ uri: userPhoto }} style={styles.composeAvatarImg} /> : <MaterialCommunityIcons name="account" size={26} color="#888" />}
              </View>
              <View style={{ flex: 1 }}>
                {userName ? <Text style={styles.modalUserName}>{userName}</Text> : null}
                <TextInput
                  style={styles.modalInput}
                  multiline
                  placeholder="What's happening?"
                  placeholderTextColor="#657786"
                  value={postText}
                  onChangeText={(text) => setPostText(text)}
                  maxLength={5000}
                  autoFocus
                />
              </View>
            </View>

            {postImage && (
              <View style={styles.imagePreviewWrap}>
                <Image source={{ uri: postImage }} style={styles.imagePreview} resizeMode="contain" />
                <TouchableOpacity style={styles.removeImg} onPress={() => setPostImage(null)}>
                  <MaterialCommunityIcons name="close-circle" size={26} color="#f44336" />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.modalToolbar}>
              <TouchableOpacity onPress={pickImage} style={styles.toolbarBtn}>
                <MaterialCommunityIcons name="image-outline" size={24} color="#1DA1F2" />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      <FlatList
        data={feed}
        keyExtractor={(item) => item.id}
        renderItem={renderPostItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <TouchableOpacity
            style={styles.composeCard}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.85}
          >
            <View style={styles.composeRow}>
              <View style={styles.composeAvatar}>
                {userPhoto ? <Image source={{ uri: userPhoto }} style={styles.composeAvatarImg} /> : <MaterialCommunityIcons name="account" size={26} color="#888" />}
              </View>
              <Text style={styles.composePlaceholder}>What's happening?</Text>
            </View>
            <View style={styles.composeHint}>
              <MaterialCommunityIcons name="image-outline" size={20} color="#1DA1F2" />
            </View>
          </TouchableOpacity>
        }
        contentContainerStyle={styles.feedList}
        ListEmptyComponent={() => (
          <View style={styles.emptyFeed}>
            <Text style={{ color: '#777' }}>No posts yet. Be the first to post!</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  feedList: {
    backgroundColor: '#fff',
    paddingBottom: 120,
  },
  composeCard: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  composeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  composeAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  composeAvatarImg: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  composePlaceholder: {
    fontSize: 16,
    color: '#657786',
    flex: 1,
  },
  composeHint: {
    padding: 6,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  cancelBtn: {
    padding: 4,
  },
  postBtn: {
    backgroundColor: '#cce5f7',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  postBtnActive: {
    backgroundColor: '#1DA1F2',
  },
  postBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  modalBody: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingTop: 14,
    flex: 1,
  },
  modalUserName: {
    fontWeight: '700',
    fontSize: 15,
    color: '#14171A',
    marginBottom: 4,
  },
  modalInput: {
    fontSize: 18,
    color: '#14171A',
    lineHeight: 26,
    textAlignVertical: 'top',
    minHeight: 120,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  imagePreviewWrap: {
    marginHorizontal: 14,
    marginBottom: 12,
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    resizeMode: 'contain',
  },
  removeImg: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  modalToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e1e8ed',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  toolbarBtn: {
    padding: 6,
    marginRight: 8,
  },
  postContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
    paddingVertical: 4,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  postHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postAvatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  postHeaderName: {
    marginLeft: 10,
    fontSize: 15,
    fontWeight: '600',
    color: '#14171A',
  },
  iconBtn: {
    padding: 8,
  },
  fullWidthImage: {
    width: '100%',
    height: 280,
    backgroundColor: '#fafafa',
  },
  postTextBody: {
    fontSize: 15,
    color: '#14171A',
    lineHeight: 22,
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 8,
  },
  postActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  emptyFeed: {
    padding: 24,
    alignItems: 'center',
  },
  editHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  editTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#14171A',
  },
  doneBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#1DA1F2',
    borderRadius: 20,
  },
  doneBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
  editBody: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  editImage: {
    width: '100%',
    height: '100%',
  },
  editToolbar: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e1e8ed',
  },
  editToolBtn: {
    alignItems: 'center',
    marginHorizontal: 24,
  },
  editToolText: {
    fontSize: 12,
    color: '#1DA1F2',
    marginTop: 4,
  },
});