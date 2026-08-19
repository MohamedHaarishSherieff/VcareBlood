import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  TouchableOpacity,
  Text,
  FlatList,
  Platform,
  TextInput,
  Dimensions
} from 'react-native';
import {
  Button,
  useTheme,
  Title,
  Avatar,
  ActivityIndicator,
  Switch,
  Portal,
  Modal,
  IconButton,
  Searchbar
} from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

import { db } from '../firebase/config';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import storageService from '../services/storageService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { statesWithDistricts } from '../data/states-districts';

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const genders = ['Male', 'Female', 'Other'];
const states = Object.keys(statesWithDistricts);

export default function EditProfileScreen({ route, navigation }) {
  const theme = useTheme();
  const screenHeight = Dimensions.get('window').height;
  
  if (!route?.params?.profile) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.centerContainer}>
          <Text style={{ color: theme.colors.text }}>No profile data available</Text>
          <Button mode="contained" onPress={() => navigation.goBack()} style={{ marginTop: 16 }}>
            Go Back
          </Button>
        </View>
      </SafeAreaView>
    );
  }
  
  const { profile } = route.params;

  const [bio, setBio] = useState(profile.bio || '');
  const [profilePhoto, setProfilePhoto] = useState(profile.profilePhoto);
  const [hidePhoneNumber, setHidePhoneNumber] = useState(profile.hidePhoneNumber || false);
  const [name, setName] = useState(profile.name || '');
  const [gender, setGender] = useState(profile.gender || '');
  const [dateOfBirth, setDateOfBirth] = useState(profile.dateOfBirth || '');
  const [bloodGroup, setBloodGroup] = useState(profile.bloodGroup || '');
  const [state, setState] = useState(profile.state || '');
  const [city, setCity] = useState(profile.city || '');
  
  const [loading, setLoading] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  
  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState(null); // 'gender', 'bloodGroup', 'state', 'city'
  const [modalTitle, setModalTitle] = useState('');
  const [modalData, setModalData] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [availableDistricts, setAvailableDistricts] = useState([]);

  useEffect(() => {
    if (state) {
      const districts = statesWithDistricts[state] || [];
      setAvailableDistricts(districts);
      if (city && !districts.includes(city)) {
        setCity('');
      }
    } else {
      setAvailableDistricts([]);
      setCity('');
    }
  }, [state]);

  const openSelectionModal = (type) => {
    setModalType(type);
    setSearchQuery('');
    if (type === 'gender') {
      setModalTitle('Select Gender');
      setModalData(genders);
    } else if (type === 'bloodGroup') {
      setModalTitle('Select Blood Group');
      setModalData(bloodGroups);
    } else if (type === 'state') {
      setModalTitle('Select State');
      setModalData(states);
    } else if (type === 'city') {
      setModalTitle('Select City/District');
      setModalData(availableDistricts);
    }
    setModalVisible(true);
  };

  const handleSelect = (item) => {
    if (modalType === 'gender') setGender(item);
    else if (modalType === 'bloodGroup') setBloodGroup(item);
    else if (modalType === 'state') setState(item);
    else if (modalType === 'city') setCity(item);
    setModalVisible(false);
  };

  const handleDatePicked = (date) => {
    try {
      if (date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        setDateOfBirth(`${year}-${month}-${day}`);
      }
    } catch (error) {
      console.error('Error setting date:', error);
    } finally {
      setDatePickerVisible(false);
    }
  };

  const formatDateForDisplay = (dateString) => {
    if (!dateString || dateString === 'Not set') return 'Select date';
    try {
      const parts = dateString.split('-');
      if (parts.length !== 3) return dateString;
      const date = new Date(parts[0], parseInt(parts[1]) - 1, parts[2]);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (error) {
      return dateString;
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true
    });
    if (!result.canceled) {
      setProfilePhoto(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const handleDeletePhoto = async () => {
    Alert.alert(
      'Delete Profile Photo',
      'Are you sure you want to delete your profile photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);

              const storedUserId = await AsyncStorage.getItem('userId');
              const profileKey = storedUserId || profile._id || profile.phoneNumber;

              if (!profileKey) {
                throw new Error('Invalid profile key; cannot delete photo');
              }

              await storageService.deleteProfilePhoto(profileKey);

              await updateDoc(doc(db, 'Mobile_Numbers', profileKey, 'profile_details', 'details'), {
                profilePhoto: '',
                updatedAt: serverTimestamp()
              });

              setProfilePhoto('');
              Alert.alert('Success', 'Profile photo deleted successfully');
            } catch (error) {
              console.error('Error deleting profile photo:', error);
              Alert.alert('Error', 'Failed to delete profile photo');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) return Alert.alert('Validation', 'Name is required');
    try {
      setLoading(true);
      let photoUrl = profilePhoto || '';
      if (profilePhoto?.startsWith('data:')) {
        const storedUserId = await AsyncStorage.getItem('userId');
        photoUrl = await storageService.uploadProfilePhoto({ userId: storedUserId || profile._id, base64: profilePhoto });
      }
      await updateDoc(doc(db, 'Mobile_Numbers', profile._id, 'profile_details', 'details'), {
        bio: bio.trim(), profilePhoto: photoUrl, hidePhoneNumber, name: name.trim(), nameLower: name.trim().toLowerCase(),
        gender, dateOfBirth, bloodGroup, state, city, updatedAt: serverTimestamp()
      });
      navigation.navigate('ProfileTab');
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const filteredData = modalData.filter(item => 
    item.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Title style={styles.title}>Edit Profile</Title>

        <View style={styles.photoSection}>
          {profilePhoto ? <Image source={{ uri: profilePhoto }} style={styles.profilePhoto} /> : <Avatar.Icon size={100} icon="account" />}
          <View style={styles.photoButtons}>
            <Button mode="text" icon="camera" onPress={pickImage}>Change Photo</Button>
            {profilePhoto && (
              <Button mode="text" icon="delete" onPress={handleDeletePhoto} textColor="#ff4444">Delete Photo</Button>
            )}
          </View>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput value={name} onChangeText={setName} style={styles.input} placeholder="Your name" />

          <Text style={styles.label}>Bio</Text>
          <TextInput value={bio} onChangeText={setBio} style={[styles.input, styles.bioInput]} placeholder="Tell us about yourself" multiline numberOfLines={3} />

          <Text style={styles.label}>Gender</Text>
          <TouchableOpacity style={styles.pickerTrigger} onPress={() => openSelectionModal('gender')}>
            <Text style={[styles.pickerValue, (!gender || gender === 'Not set') && styles.placeholder]}>{gender || 'Select Gender'}</Text>
            <MaterialCommunityIcons name="chevron-down" size={20} color="#ff6b6b" />
          </TouchableOpacity>

          <Text style={styles.label}>Date of Birth</Text>
          <TouchableOpacity style={styles.pickerTrigger} onPress={() => setDatePickerVisible(true)}>
            <Text style={[styles.pickerValue, (!dateOfBirth || dateOfBirth === 'Not set') && styles.placeholder]}>{formatDateForDisplay(dateOfBirth)}</Text>
            <MaterialCommunityIcons name="calendar" size={20} color="#ff6b6b" />
          </TouchableOpacity>

          <Text style={styles.label}>Blood Group</Text>
          <TouchableOpacity style={styles.pickerTrigger} onPress={() => openSelectionModal('bloodGroup')}>
            <Text style={[styles.pickerValue, (!bloodGroup || bloodGroup === 'Not set') && styles.placeholder]}>{bloodGroup || 'Select Blood Group'}</Text>
            <MaterialCommunityIcons name="chevron-down" size={20} color="#ff6b6b" />
          </TouchableOpacity>

          <Text style={styles.label}>State</Text>
          <TouchableOpacity style={styles.pickerTrigger} onPress={() => openSelectionModal('state')}>
            <Text style={[styles.pickerValue, (!state || state === 'Not set') && styles.placeholder]}>{state || 'Select State'}</Text>
            <MaterialCommunityIcons name="chevron-down" size={20} color="#ff6b6b" />
          </TouchableOpacity>

          <Text style={styles.label}>City/District</Text>
          <TouchableOpacity 
            style={[styles.pickerTrigger, !state && styles.disabledTrigger]} 
            onPress={() => state && openSelectionModal('city')}
            disabled={!state}
          >
            <Text style={[styles.pickerValue, (!city || city === 'Not set') && styles.placeholder]}>{city || (state ? 'Select City' : 'Select state first')}</Text>
            <MaterialCommunityIcons name="map-marker" size={20} color={state ? "#ff6b6b" : "#ccc"} />
          </TouchableOpacity>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Hide mobile number from public</Text>
            <Switch value={hidePhoneNumber} onValueChange={setHidePhoneNumber} color="#ff6b6b" />
          </View>

          <Button mode="contained" onPress={handleSave} loading={loading} disabled={loading} style={styles.saveBtn} labelStyle={styles.btnLabel}>Save Changes</Button>
          <Button mode="outlined" onPress={() => navigation.goBack()} style={styles.cancelBtn} textColor="#ff6b6b" disabled={loading}>Cancel</Button>
        </View>

        {/* Extra space for Tab Bar */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Date Picker */}
      <DateTimePickerModal
        isVisible={datePickerVisible}
        mode="date"
        date={dateOfBirth && dateOfBirth !== 'Not set' ? new Date(dateOfBirth + 'T00:00:00') : new Date(2000, 0, 1)}
        onConfirm={handleDatePicked}
        onCancel={() => setDatePickerVisible(false)}
        maximumDate={new Date()}
      />

      {/* Selection Modal */}
      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          contentContainerStyle={[styles.modalContainer, { maxHeight: screenHeight * 0.7 }]}
        >
          <View style={styles.modalHeader}>
            <Title style={styles.modalTitle}>{modalTitle}</Title>
            <IconButton icon="close" size={24} onPress={() => setModalVisible(false)} />
          </View>
          
          {(modalType === 'state' || modalType === 'city') && (
            <Searchbar
              placeholder="Search..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.modalSearch}
            />
          )}

          <FlatList
            data={filteredData}
            keyExtractor={item => item}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.modalItem} onPress={() => handleSelect(item)}>
                <Text style={[styles.modalItemText, (item === gender || item === bloodGroup || item === state || item === city) && styles.selectedItemText]}>
                  {item}
                </Text>
                {(item === gender || item === bloodGroup || item === state || item === city) && (
                  <MaterialCommunityIcons name="check" size={20} color="#ff6b6b" />
                )}
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            contentContainerStyle={styles.modalList}
          />
        </Modal>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  scrollContent: { padding: 20, paddingBottom: 120 },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, color: 'rgb(211, 16, 16)' },
  photoSection: { alignItems: 'center', marginBottom: 20 },
  photoButtons: { flexDirection: 'row', justifyContent: 'center', gap: 10 },
  profilePhoto: { width: 100, height: 100, borderRadius: 50 },
  form: { width: '100%' },
  label: { fontSize: 14, fontWeight: '700', color: '#555', marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1.5,
    borderColor: '#ffbaba',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fff'
  },
  bioInput: { minHeight: 80, textAlignVertical: 'top' },
  pickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: '#ffbaba',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff'
  },
  disabledTrigger: { backgroundColor: '#f9f9f9', borderColor: '#eee' },
  pickerValue: { fontSize: 16, color: '#333', fontWeight: '500' },
  placeholder: { color: '#ccc' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 20 },
  switchLabel: { fontSize: 14, color: '#666', flex: 1, marginRight: 10 },
  saveBtn: { backgroundColor: '#ff6b6b', borderRadius: 12, marginTop: 10, paddingVertical: 4 },
  cancelBtn: { borderRadius: 12, marginTop: 12, paddingVertical: 4, borderColor: '#ff6b6b' },
  btnLabel: { fontWeight: 'bold', fontSize: 16 },
  
  // Modal Styles
  modalContainer: { backgroundColor: 'white', padding: 20, margin: 20, borderRadius: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  modalTitle: { fontSize: 18, color: '#333' },
  modalSearch: { marginBottom: 10, borderRadius: 10, elevation: 0, backgroundColor: '#f5f5f5' },
  modalList: { paddingBottom: 20 },
  modalItem: { paddingVertical: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalItemText: { fontSize: 16, color: '#444' },
  selectedItemText: { color: '#ff6b6b', fontWeight: 'bold' },
  separator: { height: 1, backgroundColor: '#f0f0f0' },
});
