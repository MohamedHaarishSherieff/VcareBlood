import { ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../firebase/config';

const storageService = {
  uploadProfilePhoto: async ({ userId, base64 }) => {
    if (!userId) throw new Error('Missing userId for profile photo upload');

    const path = `profile_photos/${userId}.jpg`;
    const fileRef = ref(storage, path);

    // base64 should be data URL format (data:image/jpeg;base64,....)
    const snapshot = await uploadString(fileRef, base64, 'data_url');
    return getDownloadURL(snapshot.ref);
  },

  uploadPostImage: async ({ postId, base64 }) => {
    if (!postId) throw new Error('Missing postId for post image upload');

    const path = `post_images/${postId}.jpg`;
    const fileRef = ref(storage, path);

    const snapshot = await uploadString(fileRef, base64, 'data_url');
    return getDownloadURL(snapshot.ref);
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
      // It's common for posts not to have images, so we just log a warning
      console.log('Image not found or deletion skipped:', error.message);
    }
  },
};

export default storageService;
