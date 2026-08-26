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
  const { phoneNumber, name } = route?.params || {};
  const screenHeight = Dimensions.get('window').height;
  
  const [loading, setLoading] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [tempDay, setTempDay] = useState(1);
  const [tempMonth, setTempMonth] = useState(0);
  const [tempYear, setTempYear] = useState(2000);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  
  const [formData, setFormData] = useState({
    name: name || '',
    dateOfBirth: '',
    gender: '',
    bloodGroup: '',
    state: '',
    city: '',
    phoneNumber: phoneNumber || '',
  });

  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalData, setModalData] = useState([]);

  useEffect(() => {
    if (phoneNumber) {
      setFormData(prev => ({ ...prev, phoneNumber }));
    }
    if (name) {
      setFormData(prev => ({ ...prev, name }));
    }
  }, [phoneNumber, name]);

  const updateFormData = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const openSelectionModal = (type) => {
    setModalType(type);
    setSearchQuery('');
    
    if (type === 'bloodGroup') setModalData(bloodGroups);
    else if (type === 'gender') setModalData(genders);
    else if (type === 'state') setModalData(states);
    else if (type === 'city' && formData.state) setModalData(statesWithDistricts[formData.state] || []);
    
    setModalVisible(true);
  };

  const selectOption = (value) => {
    if (modalType === 'state') {
      setFormData(prev => ({ ...prev, state: value, city: '' }));
    } else {
      updateFormData(modalType, value);
    }
    setModalVisible(false);
  };

  const openDateModal = () => {
    if (formData.dateOfBirth) {
      const parts = formData.dateOfBirth.split('-');
      if (parts.length === 3) {
        setTempYear(parseInt(parts[0], 10));
        setTempMonth(parseInt(parts[1], 10) - 1);
        setTempDay(parseInt(parts[2], 10));
      }
    }
    setDatePickerVisible(true);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true })
    ]).start();
  };

  const confirmDate = () => {
    const formattedMonth = String(tempMonth + 1).padStart(2, '0');
    const formattedDay = String(tempDay).padStart(2, '0');
    const selectedDateStr = `${tempYear}-${formattedMonth}-${formattedDay}`;

    const birthDate = new Date(tempYear, tempMonth, tempDay);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    if (age < 18) {
      Alert.alert('Age Restriction', 'You must be at least 18 years old to register as a donor.');
      return;
    }

    updateFormData('dateOfBirth', selectedDateStr);
    setDatePickerVisible(false);
  };

  const formatDateForDisplay = (dateStr) => {
    if (!dateStr) return 'Select Date of Birth';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const year = parts[0];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return `${day} ${monthNames[monthIndex]} ${year}`;
  };

  const getDaysInMonth = (month, year) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.dateOfBirth || !formData.gender || !formData.bloodGroup || !formData.state || !formData.city) {
      Alert.alert('Incomplete Form', 'Please fill in all required fields marked with *');
      return;
    }

    if (!formData.phoneNumber) {
      Alert.alert('Error', 'Verified mobile number is missing. Please start verification again.');
      return;
    }

    setLoading(true);

    try {
      const profileData = {
        name: formData.name.trim(),
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        bloodGroup: formData.bloodGroup,
        state: formData.state,
        city: formData.city,
        phoneNumber: formData.phoneNumber,
        isVerified: true,
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'Mobile_Numbers', formData.phoneNumber, 'profile_details', 'details'), profileData, { merge: true });
      await setDoc(doc(db, 'Mobile_Numbers', formData.phoneNumber), { hasAccount: true, updatedAt: serverTimestamp() }, { merge: true });
      await AsyncStorage.setItem('userPhoneNumber', formData.phoneNumber);

      setLoading(false);
      navigation.navigate('HomeTab');
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
        <MaterialCommunityIcons name="arrow-left" size={24} color="#334155" />
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
          {/* Locked Verified Phone Badge */}
          {formData.phoneNumber ? (
            <View style={styles.verifiedPhoneBadge}>
              <MaterialCommunityIcons name="shield-check" size={20} color="#16A34A" />
              <Text style={styles.verifiedPhoneText}>
                Verified Phone: +91 {formData.phoneNumber}
              </Text>
            </View>
          ) : null}

          <Text style={styles.label}>Full Name *</Text>
          <TextInput 
            value={formData.name} 
            onChangeText={(val) => updateFormData('name', val)} 
            style={styles.input} 
            placeholder="John Doe" 
          />

          <Text style={styles.label}>Gender *</Text>
          <TouchableOpacity style={styles.pickerTrigger} onPress={() => openSelectionModal('gender')}>
            <Text style={[styles.pickerValue, !formData.gender && styles.placeholder]}>{formData.gender || 'Select Gender'}</Text>
            <MaterialCommunityIcons name="chevron-down" size={20} color="#D32F2F" />
          </TouchableOpacity>

          <Text style={styles.label}>Date of Birth *</Text>
          <TouchableOpacity style={styles.pickerTrigger} onPress={openDateModal} accessibilityRole="button" accessibilityLabel="Select date of birth">
            <Text style={[styles.pickerValue, !formData.dateOfBirth && styles.placeholder]}>{formatDateForDisplay(formData.dateOfBirth)}</Text>
            <MaterialCommunityIcons name="calendar" size={20} color="#D32F2F" />
          </TouchableOpacity>

          <Text style={styles.label}>Blood Group *</Text>
          <TouchableOpacity style={styles.pickerTrigger} onPress={() => openSelectionModal('bloodGroup')}>
            <Text style={[styles.pickerValue, !formData.bloodGroup && styles.placeholder]}>{formData.bloodGroup || 'Select Blood Group'}</Text>
            <MaterialCommunityIcons name="chevron-down" size={20} color="#D32F2F" />
          </TouchableOpacity>

          <Text style={styles.label}>State *</Text>
          <TouchableOpacity style={styles.pickerTrigger} onPress={() => openSelectionModal('state')}>
            <Text style={[styles.pickerValue, !formData.state && styles.placeholder]}>{formData.state || 'Select State'}</Text>
            <MaterialCommunityIcons name="chevron-down" size={20} color="#D32F2F" />
          </TouchableOpacity>

          <Text style={styles.label}>City/District *</Text>
          <TouchableOpacity style={[styles.pickerTrigger, !formData.state && styles.disabledTrigger]} onPress={() => formData.state && openSelectionModal('city')} disabled={!formData.state}>
            <Text style={[styles.pickerValue, !formData.city && styles.placeholder]}>{formData.city || (formData.state ? 'Select City' : 'Select state first')}</Text>
            <MaterialCommunityIcons name="map-marker" size={20} color={formData.state ? "#D32F2F" : "#ccc"} />
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

            <View style={styles.pickerColumnsContainer}>
              {/* Day Column */}
              <View style={styles.pickerColumn}>
                <Text style={styles.columnHeader}>Day</Text>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollColContent}>
                  {Array.from({ length: getDaysInMonth(tempMonth, tempYear) }, (_, i) => i + 1).map((day) => (
                    <TouchableOpacity key={day} style={[styles.pickerItem, tempDay === day && styles.selectedPickerItem]} onPress={() => setTempDay(day)}>
                      <Text style={[styles.pickerItemText, tempDay === day && styles.selectedPickerItemText]}>{day}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Month Column */}
              <View style={styles.pickerColumn}>
                <Text style={styles.columnHeader}>Month</Text>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollColContent}>
                  {monthNames.map((month, idx) => (
                    <TouchableOpacity key={month} style={[styles.pickerItem, tempMonth === idx && styles.selectedPickerItem]} onPress={() => setTempMonth(idx)}>
                      <Text style={[styles.pickerItemText, tempMonth === idx && styles.selectedPickerItemText]}>{month}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Year Column */}
              <View style={styles.pickerColumn}>
                <Text style={styles.columnHeader}>Year</Text>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollColContent}>
                  {years.map((year) => (
                    <TouchableOpacity key={year} style={[styles.pickerItem, tempYear === year && styles.selectedPickerItem]} onPress={() => setTempYear(year)}>
                      <Text style={[styles.pickerItemText, tempYear === year && styles.selectedPickerItemText]}>{year}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            <View style={styles.modalActions}>
              <Button mode="outlined" onPress={() => setDatePickerVisible(false)} style={styles.cancelBtn}>Cancel</Button>
              <Button mode="contained" onPress={confirmDate} style={styles.confirmBtn}>Confirm</Button>
            </View>
          </Animated.View>
        </Modal>

        {/* Selection Modal */}
        <Modal visible={modalVisible} onDismiss={() => setModalVisible(false)} contentContainerStyle={styles.selectionModal}>
          <View style={styles.modalHeader}>
            <Title style={styles.modalTitle}>Select {modalType.charAt(0).toUpperCase() + modalType.slice(1)}</Title>
            <IconButton icon="close" size={24} onPress={() => setModalVisible(false)} />
          </View>

          {modalData.length > 5 && (
            <Searchbar placeholder="Search..." onChangeText={setSearchQuery} value={searchQuery} style={styles.searchBar} />
          )}

          <FlatList
            data={filteredData}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.listItem} onPress={() => selectOption(item)}>
                <Text style={styles.listItemText}>{item}</Text>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#D32F2F" />
              </TouchableOpacity>
            )}
          />
        </Modal>
      </Portal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  backButton: {
    position: 'absolute',
    top: 48,
    left: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 80,
  },
  headerSection: {
    marginBottom: 20,
    alignItems: 'center',
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  verifiedPhoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  verifiedPhoneText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#15803D',
    marginLeft: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
  },
  pickerTrigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
  },
  disabledTrigger: {
    backgroundColor: '#F1F5F9',
  },
  pickerValue: {
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '500',
  },
  placeholder: {
    color: '#94A3B8',
  },
  submitBtn: {
    marginTop: 24,
    backgroundColor: '#D32F2F',
    borderRadius: 10,
    paddingVertical: 6,
  },
  datePickerModal: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    borderRadius: 16,
    padding: 16,
  },
  datePickerContent: {
    width: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  pickerColumnsContainer: {
    flexDirection: 'row',
    height: 180,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
    marginVertical: 10,
  },
  pickerColumn: {
    flex: 1,
    alignItems: 'center',
  },
  columnHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginVertical: 6,
  },
  scrollColContent: {
    paddingVertical: 4,
  },
  pickerItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginVertical: 2,
    alignItems: 'center',
  },
  selectedPickerItem: {
    backgroundColor: '#FEE2E2',
  },
  pickerItemText: {
    fontSize: 14,
    color: '#334155',
  },
  selectedPickerItemText: {
    color: '#D32F2F',
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  cancelBtn: {
    marginRight: 8,
    borderColor: '#CBD5E1',
  },
  confirmBtn: {
    backgroundColor: '#D32F2F',
  },
  selectionModal: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    borderRadius: 16,
    padding: 16,
    maxHeight: '70%',
  },
  searchBar: {
    marginBottom: 12,
    elevation: 0,
    backgroundColor: '#F1F5F9',
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  listItemText: {
    fontSize: 15,
    color: '#1E293B',
    fontWeight: '500',
  },
});

export default DonorDetailsRegistrationScreen;
