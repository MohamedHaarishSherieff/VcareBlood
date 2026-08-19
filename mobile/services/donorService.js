import { db, authentication } from '../firebase/config';
import {
  collection,
  collectionGroup,
  addDoc,
  getDocs,
  query as firestoreQuery,
  where,
  orderBy,
  limit,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { handleApiError } from './api';

const donorsCollection = collection(db, 'donors');

export const donorService = {
  registerDonor: async (donorData) => {
    try {
      if (!donorData || !donorData.phoneNumber) {
        throw new Error('Donor data is incomplete. Please provide all required fields.');
      }

      if (!authentication?.currentUser) {
        try {
          await signInAnonymously(authentication);
        } catch (authError) {
          console.warn('Anonymous sign-in failed for donor registration:', authError);
        }
      }

      const docRef = await addDoc(donorsCollection, {
        ...donorData,
        createdAt: serverTimestamp(),
      });

      return { id: docRef.id, ...donorData };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  searchDonors: async (params = {}) => {
    try {
      const { bloodGroup, state, city } = params;

      // Query registered profiles from profile_details subcollections
      const profileDetailsGroup = collectionGroup(db, 'profile_details');
      const snapshot = await getDocs(profileDetailsGroup);

      let donors = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        const phone = data.phoneNumber || docSnap.ref.parent?.parent?.id || docSnap.id;
        return {
          id: phone,
          phoneNumber: phone,
          ...data,
        };
      });

      // Include registered donors (must have a non-empty name)
      donors = donors.filter((d) => d.name && d.name.trim().length > 0);

      // Filter by blood group if provided
      if (bloodGroup) {
        donors = donors.filter((d) => (d.bloodGroup || '').trim().toUpperCase() === bloodGroup.trim().toUpperCase());
      }

      // Filter by state if provided
      if (state && state !== 'All') {
        donors = donors.filter((d) => (d.state || '').trim().toLowerCase() === state.trim().toLowerCase());
      }

      // Filter by city/district if provided
      if (city) {
        donors = donors.filter((d) => (d.city || '').trim().toLowerCase() === city.trim().toLowerCase());
      }

      return donors;
    } catch (error) {
      console.error('donorService.searchDonors error:', error);
      // Fallback in case collectionGroup is limited or restricted
      try {
        const snapshot = await getDocs(donorsCollection);
        let donors = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
        donors = donors.filter((d) => d.name && d.name.trim().length > 0);
        if (bloodGroup) donors = donors.filter((d) => (d.bloodGroup || '').toUpperCase() === bloodGroup.toUpperCase());
        if (state && state !== 'All') donors = donors.filter((d) => (d.state || '').toLowerCase() === state.toLowerCase());
        if (city) donors = donors.filter((d) => (d.city || '').toLowerCase() === city.toLowerCase());
        return donors;
      } catch (fallbackErr) {
        throw handleApiError(error);
      }
    }
  },

  getDonorById: async (id) => {
    try {
      if (!id) throw new Error('Donor id is required');
      const docSnap = await getDoc(doc(db, 'donors', id));
      if (!docSnap.exists()) throw new Error('Donor not found');
      return { id: docSnap.id, ...docSnap.data() };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  updateDonor: async (id, data) => {
    try {
      if (!id) throw new Error('Donor id is required');
      await updateDoc(doc(db, 'donors', id), { ...data, updatedAt: serverTimestamp() });
      return { id, ...data };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  deleteDonor: async (id) => {
    try {
      if (!id) throw new Error('Donor id is required');
      await deleteDoc(doc(db, 'donors', id));
      return true;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  isDonorQuery: (message) => {
    const lowerMessage = (message || '').toLowerCase();
    const donorKeywords = ['need', 'looking for', 'find', 'search', 'donor', 'blood', 'want', 'need'];
    const bloodGroups = ['a+', 'a-', 'b+', 'b-', 'ab+', 'ab-', 'o+', 'o-'];

    const hasDonorKeyword = donorKeywords.some((keyword) => lowerMessage.includes(keyword));
    const hasBloodGroup = bloodGroups.some((group) => lowerMessage.includes(group));
    const hasLocation = lowerMessage.includes(' in ') || lowerMessage.includes(' near ') || lowerMessage.includes(' tamil');

    return hasDonorKeyword && hasBloodGroup && hasLocation;
  },

  extractDonorQuery: (message) => {
    const lowerMessage = (message || '').toLowerCase();
    const bloodGroups = ['a+', 'a-', 'b+', 'b-', 'ab+', 'ab-', 'o+', 'o-'];

    let bloodGroup = null;
    for (const group of bloodGroups) {
      if (lowerMessage.includes(group)) {
        bloodGroup = group.toUpperCase();
        break;
      }
    }

    let location = null;
    const inMatch = lowerMessage.match(/(?:in|near|at)\s+([a-z\s]+)/i);
    if (inMatch && inMatch[1]) {
      location = inMatch[1].trim();
    }

    return { bloodGroup, location };
  },
};
