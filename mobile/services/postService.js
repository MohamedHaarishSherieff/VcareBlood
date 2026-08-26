import { collection, addDoc, serverTimestamp, updateDoc, getDocs, getDoc, query, orderBy, limit, where, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import storageService from './storageService';
import { handleApiError } from './api';

const postsCollection = collection(db, 'posts');

const TEN_DAYS_IN_MS = 10 * 24 * 60 * 60 * 1000; // 10 days in milliseconds

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
        likes: 0,
        likedBy: [],
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

  /**
   * Permanently delete posts that are 10 days or older from Firestore
   */
  cleanupExpiredPosts: async () => {
    try {
      const now = new Date().getTime();
      const snapshot = await getDocs(postsCollection);
      const deletePromises = [];

      snapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        let createdAtDate = null;
        if (data.createdAt && typeof data.createdAt.toDate === 'function') {
          createdAtDate = data.createdAt.toDate();
        } else if (data.createdAt && data.createdAt.seconds) {
          createdAtDate = new Date(data.createdAt.seconds * 1000);
        }

        if (createdAtDate) {
          const ageInMillis = now - createdAtDate.getTime();
          if (ageInMillis >= TEN_DAYS_IN_MS) {
            console.log(`Auto-deleting post >10 days old: ${docSnap.id}`);
            deletePromises.push(
              storageService.deletePostImage(docSnap.id).catch(() => {}),
              deleteDoc(doc(db, 'posts', docSnap.id)).catch(() => {})
            );
          }
        }
      });

      if (deletePromises.length > 0) {
        await Promise.all(deletePromises);
        console.log(`Cleaned up ${deletePromises.length} expired posts.`);
      }
    } catch (error) {
      console.warn('Expired posts cleanup notice:', error);
    }
  },

  toggleLikePost: async (postId, userId) => {
    try {
      if (!postId || !userId) return null;
      const cleanUserId = userId.toString().replace(/\D/g, '').slice(-10) || userId;
      const postRef = doc(db, 'posts', postId);
      const postSnap = await getDoc(postRef);
      if (!postSnap.exists()) return null;

      const data = postSnap.data();
      const likes = Number(data.likes || 0);
      const likedBy = Array.isArray(data.likedBy) ? data.likedBy : [];

      const isLiked = likedBy.includes(cleanUserId) || likedBy.includes(userId);
      let updatedLikes = likes;
      let updatedLikedBy = [];

      if (isLiked) {
        updatedLikes = Math.max(0, likes - 1);
        updatedLikedBy = likedBy.filter(id => id !== cleanUserId && id !== userId);
      } else {
        updatedLikes = likes + 1;
        updatedLikedBy = [...likedBy, cleanUserId];
      }

      await updateDoc(postRef, {
        likes: updatedLikes,
        likedBy: updatedLikedBy,
        updatedAt: serverTimestamp(),
      });

      return { likes: updatedLikes, isLiked: !isLiked };
    } catch (error) {
      console.error('Error toggling like:', error);
      throw handleApiError(error);
    }
  },

  getFeed: async ({ limitCount = 50 } = {}) => {
    try {
      // Trigger background cleanup for posts older than 10 days
      postService.cleanupExpiredPosts().catch(() => {});

      let snapshot;
      try {
        const q = query(postsCollection, orderBy('createdAt', 'desc'), limit(limitCount));
        snapshot = await getDocs(q);
      } catch (err) {
        console.warn('orderBy query failed, fetching posts fallback:', err);
        const qFallback = query(postsCollection, limit(limitCount));
        snapshot = await getDocs(qFallback);
      }

      const now = new Date().getTime();
      const posts = snapshot.docs
        .map(doc => {
          const data = doc.data();
          let createdAt = data.createdAt;
          if (createdAt && typeof createdAt.toDate === 'function') {
            createdAt = createdAt.toDate();
          } else if (createdAt && createdAt.seconds) {
            createdAt = new Date(createdAt.seconds * 1000);
          } else if (!createdAt) {
            createdAt = new Date();
          }
          return { id: doc.id, ...data, createdAt };
        })
        .filter(post => {
          // Exclude any posts that are 10 days or older
          const postTime = post.createdAt instanceof Date ? post.createdAt.getTime() : new Date(post.createdAt).getTime();
          return now - postTime < TEN_DAYS_IN_MS;
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

  getUserPosts: async (userId, { limitCount = 50 } = {}) => {
    try {
      if (!userId) return [];
      const normalizedPhone = userId.toString().replace(/\D/g, '').slice(-10);

      const now = new Date().getTime();
      const snapshot = await getDocs(query(postsCollection, limit(limitCount * 2)));
      const posts = snapshot.docs
        .map(doc => {
          const data = doc.data();
          let createdAt = data.createdAt;
          if (createdAt && typeof createdAt.toDate === 'function') {
            createdAt = createdAt.toDate();
          } else if (createdAt && createdAt.seconds) {
            createdAt = new Date(createdAt.seconds * 1000);
          } else if (!createdAt) {
            createdAt = new Date();
          }
          return { id: doc.id, ...data, createdAt };
        })
        .filter(post => {
          const authorId = post.authorId ? post.authorId.toString() : '';
          const cleanAuthorId = authorId.replace(/\D/g, '').slice(-10);
          const matchesUser = authorId === userId || cleanAuthorId === normalizedPhone || (normalizedPhone && authorId.includes(normalizedPhone));
          
          const postTime = post.createdAt instanceof Date ? post.createdAt.getTime() : new Date(post.createdAt).getTime();
          const isFresh = now - postTime < TEN_DAYS_IN_MS;

          return matchesUser && isFresh;
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
