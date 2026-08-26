import { ref, uploadString, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../firebase/config';

const uploadMediaFile = async (fileRef, base64OrUri) => {
  if (typeof base64OrUri !== 'string') throw new Error('Invalid image format');

  if (base64OrUri.startsWith('data:')) {
    const snapshot = await uploadString(fileRef, base64OrUri, 'data_url');
    return getDownloadURL(snapshot.ref);
  } else if (base64OrUri.startsWith('http') || base64OrUri.startsWith('file:') || base64OrUri.startsWith('content:')) {
    const response = await fetch(base64OrUri);
    const blob = await response.blob();
    const snapshot = await uploadBytes(fileRef, blob);
    return getDownloadURL(snapshot.ref);
  } else {
    const snapshot = await uploadString(fileRef, base64OrUri, 'base64');
    return getDownloadURL(snapshot.ref);
  }
};

const storageService = {
  uploadProfilePhoto: async ({ userId, base64 }) => {
    if (!userId) throw new Error('Missing userId for profile photo upload');
    const path = `profile_photos/${userId}.jpg`;
    const fileRef = ref(storage, path);
    return uploadMediaFile(fileRef, base64);
  },

  uploadPostImage: async ({ postId, base64 }) => {
    if (!postId) throw new Error('Missing postId for post image upload');
    const path = `post_images/${postId}.jpg`;
    const fileRef = ref(storage, path);
    return uploadMediaFile(fileRef, base64);
  },

  deleteProfilePhoto: async (userId) => {
    if (!userId) return;
    try {
      const path = `profile_photos/${userId}.jpg`;
      const fileRef = ref(storage, path);
      await deleteObject(fileRef);
    } catch (error) {
      console.log('Profile photo delete failed:', error.message);
    }
  },

  deletePostImage: async (postId) => {
    if (!postId) return;
    try {
      const path = `post_images/${postId}.jpg`;
      const fileRef = ref(storage, path);
      await deleteObject(fileRef);
    } catch (error) {
      console.log('Image not found or deletion skipped:', error.message);
    }
  },
};

export default storageService;
