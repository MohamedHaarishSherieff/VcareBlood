import { collection, addDoc, serverTimestamp, updateDoc, getDocs, query, orderBy, limit, where, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import storageService from './storageService';
import { handleApiError } from './api';

const postsCollection = collection(db, 'posts');

const postService = {
  createPost: async ({ authorId, authorName, title, text, imageBase64 }) => {
    try {
      if (!authorId) throw new Error('Missing authorId');
      if (!title && !text && !imageBase64) throw new Error('Post must have a title, text, or image');

      const postData = {
        authorId,
        authorName: authorName || '',
        title: title || '',
        text: text || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        imageUrl: null,
      };

      const postRef = await addDoc(postsCollection, postData);
      const postId = postRef.id;

      let imageUrl = null;
      if (imageBase64) {
        imageUrl = await storageService.uploadPostImage({ postId, base64: imageBase64 });
        await updateDoc(postRef, { imageUrl, updatedAt: serverTimestamp() });
      }

      return { id: postId, ...postData, imageUrl, createdAt: new Date() };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  deletePost: async (postId) => {
    try {
      if (!postId) throw new Error('Missing postId');
      await storageService.deletePostImage(postId);
      const postRef = doc(db, 'posts', postId);
      await deleteDoc(postRef);
      return true;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  getFeed: async ({ limitCount = 50 } = {}) => {
    try {
      const q = query(postsCollection, orderBy('createdAt', 'desc'), limit(limitCount));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => {
        const data = doc.data();
        const createdAt = data.createdAt && data.createdAt.toDate ? data.createdAt.toDate() : data.createdAt;
        return { id: doc.id, ...data, createdAt };
      });
    } catch (error) {
      throw handleApiError(error);
    }
  },

  getUserPosts: async (userId, { limitCount = 50 } = {}) => {
    try {
      const q = query(
        postsCollection,
        where('authorId', '==', userId),
        limit(limitCount)
      );
      const snapshot = await getDocs(q);
      const posts = snapshot.docs.map(doc => {
        const data = doc.data();
        const createdAt = data.createdAt && data.createdAt.toDate ? data.createdAt.toDate() : (data.createdAt || new Date());
        return { id: doc.id, ...data, createdAt };
      });

      return posts.sort((a, b) => {
        const timeA = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
        const timeB = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
        return (timeB || 0) - (timeA || 0);
      });
    } catch (error) {
      throw handleApiError(error);
    }
  },
};

export default postService;
