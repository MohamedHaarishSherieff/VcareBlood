import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Text,
  TouchableOpacity,
  FlatList,
  Platform,
  TextInput,
  Dimensions,
  Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Button,
  Portal,
  Modal,
  IconButton,
  Searchbar,
  Title
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { statesWithDistricts } from '../data/states-districts';
import authService from '../services/authService';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { db } from '../firebase/config';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const genders = ['Male', 'Female', 'Other'];
const states = Object.keys(statesWithDistricts);
const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const currentYear = new Date().getFullYear();
const years = Array.from({ length: currentYear - 1900 + 1 }, (_, index) => currentYear - index);

const DonorDetailsRegistrationScreen = ({ navigation, route }) => {
  const { phoneNumber } = route.params;
  const screenHeight = Dimensions.get('window').height;
  
  const [loading, setLoading] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [tempDay, setTempDay] = useState(1);
  const [tempMonth, setTempMonth] = useState(0);
  const [tempYear, setTempYear] = useState(2000);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  
  const [formData, setFormData] = useState({
    name: '',
    dateOfBirth: '',
    gender: '',
    bloodGroup: '',
    state: '',
    city: '',
    phoneNumber: phoneNumber || '',
  });

  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [modalTitle, setModalTitle] = useState('');
  const [modalData, setModalData] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [availableDistricts, setAvailableDistricts] = useState([]);

  useEffect(() => {
    if (formData.state) {
      const districts = statesWithDistricts[formData.state] || [];
      setAvailableDistricts(districts);
      if (formData.city && !districts.includes(formData.city)) {
        updateFormData('city', '');
      }
    } else {
      setAvailableDistricts([]);
      updateFormData('city', '');
    }
  }, [formData.state]);

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

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
    updateFormData(modalType, item);
    setModalVisible(false);
  };

  const getDaysInMonth = (year, monthIndex) => {
    return new Date(year, monthIndex + 1, 0).getDate();
  };

  const openDateModal = () => {
    const current = formData.dateOfBirth ? parseDateString(formData.dateOfBirth) : new Date(2000, 0, 1);
    setTempDay(current.getDate());
    setTempMonth(current.getMonth());
    setTempYear(current.getFullYear());
    setDatePickerVisible(true);
  };

  const handleSaveDate = () => {
    const selected = new Date(tempYear, tempMonth, tempDay);
    const today = new Date();
    if (selected > today) {
      return Alert.alert('Invalid date', 'Date of birth cannot be in the future.');
    }
    const year = selected.getFullYear();
    const month = String(selected.getMonth() + 1).padStart(2, '0');
    const day = String(selected.getDate()).padStart(2, '0');
    updateFormData('dateOfBirth', `${year}-${month}-${day}`);
    setDatePickerVisible(false);
  };

  useEffect(() => {
    if (datePickerVisible) {
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [datePickerVisible]);

  useEffect(() => {
    const daysInMonth = getDaysInMonth(tempYear, tempMonth);
    if (tempDay > daysInMonth) {
      setTempDay(daysInMonth);
    }
  }, [tempMonth, tempYear]);

  const formatDateForDisplay = (dateString) => {
    if (!dateString) return 'Select your date';
    try {
      const parts = dateString.split('-');
      if (parts.length !== 3) return dateString;
      const date = new Date(parts[0], parseInt(parts[1], 10) - 1, parts[2]);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (error) {
      return dateString;
    }
  };

  const parseDateString = (dateString) => {
    const parts = dateString.split('-');
    if (parts.length !== 3) return new Date(2000, 0, 1);
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.dateOfBirth || !formData.gender || !formData.bloodGroup || !formData.state || !formData.city) {
      return Alert.alert('Validation', 'Please fill all required fields');
    }

    setLoading(true);
    try {
      const profileData = {
        phoneNumber: formData.phoneNumber,
        name: formData.name,
        nameLower: formData.name.trim().toLowerCase(),
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        bloodGroup: formData.bloodGroup,
        state: formData.state,
        city: formData.city,
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'Mobile_Numbers', formData.phoneNumber, 'profile_details', 'details'), profileData, { merge: true });
      await setDoc(doc(db, 'Mobile_Numbers', formData.phoneNumber), { hasAccount: true, updatedAt: serverTimestamp() }, { merge: true });
      await AsyncStorage.setItem('userPhoneNumber', formData.phoneNumber);

      setLoading(false);
      navigation.navigate('ProfileTab');
    } catch (error) {
      setLoading(false);
      Alert.alert('Error', 'Registration failed. Please try again.');
    }
  };

  const filteredData = modalData.filter(item => 
    item.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={[styles.container]}>
      {/* Back Button */}
      <TouchableOpacity 
        onPress={() => navigation.goBack()}
        style={styles.backButton}
      >
        <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="on-drag"
      >
        <View style={styles.headerSection}>
          <Text style={styles.mainTitle}>Complete Profile</Text>
          <Text style={styles.subtitle}>Tell us about yourself to save lives</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Full Name *</Text>
          <TextInput value={formData.name} onChangeText={(val) => updateFormData('name', val)} style={styles.input} placeholder="John Doe" />

          <Text style={styles.label}>Gender *</Text>
          <TouchableOpacity style={styles.pickerTrigger} onPress={() => openSelectionModal('gender')}>
            <Text style={[styles.pickerValue, !formData.gender && styles.placeholder]}>{formData.gender || 'Select Gender'}</Text>
            <MaterialCommunityIcons name="chevron-down" size={20} color="#ff6b6b" />
          </TouchableOpacity>

          <Text style={styles.label}>Date of Birth *</Text>
          <TouchableOpacity style={styles.pickerTrigger} onPress={openDateModal} accessibilityRole="button" accessibilityLabel="Select date of birth">
            <Text style={[styles.pickerValue, !formData.dateOfBirth && styles.placeholder]}>{formatDateForDisplay(formData.dateOfBirth)}</Text>
            <MaterialCommunityIcons name="calendar" size={20} color="#ff6b6b" />
          </TouchableOpacity>

          <Text style={styles.label}>Blood Group *</Text>
          <TouchableOpacity style={styles.pickerTrigger} onPress={() => openSelectionModal('bloodGroup')}>
            <Text style={[styles.pickerValue, !formData.bloodGroup && styles.placeholder]}>{formData.bloodGroup || 'Select Blood Group'}</Text>
            <MaterialCommunityIcons name="chevron-down" size={20} color="#ff6b6b" />
          </TouchableOpacity>

          <Text style={styles.label}>State *</Text>
          <TouchableOpacity style={styles.pickerTrigger} onPress={() => openSelectionModal('state')}>
            <Text style={[styles.pickerValue, !formData.state && styles.placeholder]}>{formData.state || 'Select State'}</Text>
            <MaterialCommunityIcons name="chevron-down" size={20} color="#ff6b6b" />
          </TouchableOpacity>

          <Text style={styles.label}>City/District *</Text>
          <TouchableOpacity style={[styles.pickerTrigger, !formData.state && styles.disabledTrigger]} onPress={() => formData.state && openSelectionModal('city')} disabled={!formData.state}>
            <Text style={[styles.pickerValue, !formData.city && styles.placeholder]}>{formData.city || (formData.state ? 'Select City' : 'Select state first')}</Text>
            <MaterialCommunityIcons name="map-marker" size={20} color={formData.state ? "#ff6b6b" : "#ccc"} />
          </TouchableOpacity>

          <Button mode="contained" onPress={handleSubmit} loading={loading} disabled={loading} style={styles.submitBtn}>
            Complete Registration
          </Button>

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      <Portal>
        <Modal
          visible={datePickerVisible}
          onDismiss={() => setDatePickerVisible(false)}
          contentContainerStyle={[styles.datePickerModal, { maxHeight: screenHeight * 0.8 }]}
          accessibilityLabel="Select Date of Birth"
        >
          <Animated.View style={[styles.datePickerContent, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}> 
            <View style={styles.modalHeader}>
              <Title style={styles.modalTitle}>Select Date of Birth</Title>
              <IconButton icon="close" size={24} onPress={() => setDatePickerVisible(false)} accessibilityLabel="Cancel" />
            </View>

            <View style={styles.selectorRow}>
              <View style={styles.selectorColumn}>
                <Text style={styles.selectorLabel}>Day</Text>
                <ScrollView showsVerticalScrollIndicator={false} snapToInterval={44} decelerationRate="fast" contentContainerStyle={styles.selectorList} accessibilityRole="radiogroup">
                  {Array.from({ length: getDaysInMonth(tempYear, tempMonth) }, (_, index) => index + 1).map(day => (
                    <TouchableOpacity
                      key={`day-${day}`}
                      onPress={() => setTempDay(day)}
                      style={[styles.selectorItem, tempDay === day && styles.selectorItemSelected]}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: tempDay === day }}
                      accessibilityLabel={`Day ${day}`}
                    >
                      <Text style={[styles.selectorItemText, tempDay === day && styles.selectorItemTextSelected]}>{day}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.selectorColumn}>
                <Text style={styles.selectorLabel}>Month</Text>
                <ScrollView showsVerticalScrollIndicator={false} snapToInterval={44} decelerationRate="fast" contentContainerStyle={styles.selectorList} accessibilityRole="radiogroup">
                  {monthNames.map((month, index) => (
                    <TouchableOpacity
                      key={month}
                      onPress={() => setTempMonth(index)}
                      style={[styles.selectorItem, tempMonth === index && styles.selectorItemSelected]}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: tempMonth === index }}
                      accessibilityLabel={month}
                    >
                      <Text style={[styles.selectorItemText, tempMonth === index && styles.selectorItemTextSelected]}>{month}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={[styles.selectorColumn, styles.yearColumn]}>
                <Text style={styles.selectorLabel}>Year</Text>
                <ScrollView showsVerticalScrollIndicator={false} snapToInterval={44} decelerationRate="fast" contentContainerStyle={styles.selectorList} accessibilityRole="radiogroup">
                  {years.map(year => (
                    <TouchableOpacity
                      key={year}
                      onPress={() => setTempYear(year)}
                      style={[styles.selectorItem, tempYear === year && styles.selectorItemSelected]}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: tempYear === year }}
                      accessibilityLabel={`${year}`}
                    >
                      <Text style={[styles.selectorItemText, tempYear === year && styles.selectorItemTextSelected]}>{year}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            <View style={styles.modalActionRow}>
              <Button mode="outlined" onPress={() => setDatePickerVisible(false)} style={styles.cancelButton} accessibilityLabel="Cancel date selection">
                Cancel
              </Button>
              <Button mode="contained" onPress={handleSaveDate} style={styles.saveButton} accessibilityLabel="Save date of birth">
                Save
              </Button>
            </View>
          </Animated.View>
        </Modal>

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
                <Text style={[styles.modalItemText, item === formData[modalType] && styles.selectedItemText]}>
                  {item}
                </Text>
                {item === formData[modalType] && (
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
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ff6b6b' },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
  },
  scrollContent: { padding: 20, paddingTop: 60, paddingBottom: 120 },
  headerSection: { alignItems: 'center', marginBottom: 20 },
  mainTitle: { fontSize: 32, fontWeight: '800', color: '#fff', textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#fff', textAlign: 'center', opacity: 0.9 },
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 20, elevation: 10 },
  label: { fontSize: 14, fontWeight: '700', color: '#555', marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1.5,
    borderColor: '#ffbaba',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff'
  },
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
  submitBtn: { backgroundColor: '#ff6b6b', borderRadius: 12, marginTop: 30, paddingVertical: 6 },
  
  // Date picker modal styles
  datePickerModal: { backgroundColor: 'white', padding: 16, marginHorizontal: 20, borderRadius: 20, alignItems: 'center' },
  datePickerContent: { backgroundColor: '#fff', borderRadius: 20, padding: 16, alignItems: 'center', width: '100%' },
  selectorRow: { flexDirection: 'row', justifyContent: 'center', width: '100%', marginTop: 8 },
  selectorColumn: { width: 96, alignItems: 'center', marginHorizontal: 6 },
  selectorLabel: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 10 },
  selectorList: { paddingVertical: 8, alignItems: 'center', width: '100%', maxHeight: 260 },
  selectorItem: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    marginBottom: 8,
    backgroundColor: '#fafafa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectorItemSelected: {
    borderColor: '#ff6b6b',
    backgroundColor: '#ffe7e7',
  },
  selectorItemText: { fontSize: 14, color: '#444' },
  selectorItemTextSelected: { color: '#d00000', fontWeight: '700' },
  yearColumn: { width: 108 },
  yearScroll: { width: '100%', maxHeight: 260, borderRadius: 12, borderWidth: 1, borderColor: '#f0f0f0', backgroundColor: '#fafafa', padding: 6 },
  yearList: { alignItems: 'center' },
  modalActionRow: { marginTop: 20, flexDirection: 'row', justifyContent: 'space-between' },
  cancelButton: { flex: 1, borderColor: '#ff6b6b', borderWidth: 1, borderRadius: 12, marginRight: 8 },
  saveButton: { flex: 1, backgroundColor: '#ff6b6b', borderRadius: 12 },
  
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

export default DonorDetailsRegistrationScreen;
