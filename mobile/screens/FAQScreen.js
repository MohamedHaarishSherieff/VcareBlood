import React, { useState } from 'react';
import { ScrollView, View, StyleSheet, TouchableOpacity } from 'react-native';
import { Surface, Title, Text, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const faqList = [
  {
    question: 'Who can donate blood?',
    answer: "Anyone who is healthy, aged 18+, weighs at least 50kg, and hasn't donated in the last 3 months can donate blood."
  },
  {
    question: 'What are the benefits of donating blood?',
    answer: 'Donating blood saves lives, provides a free health check, reduces heart disease risk, burns calories, and helps blood cell production.'
  },
  {
    question: 'What is the blood donation process?',
    answer: '1. Register\n2. Medical screening\n3. Donation (about 10 minutes)\n4. Rest and refreshments.'
  },
  {
    question: 'Which blood types are compatible?',
    answer: 'O- is the universal donor. AB+ is the universal recipient. See compatibility chart for details.'
  },
  {
    question: 'How do I register as a donor?',
    answer: "Go to 'Register as Donor' in the app menu, fill in your details, and submit."
  },
  {
    question: 'How do I find blood donors?',
    answer: "Use the 'Find Donors' feature to search by blood type and location."
  },
  {
    question: 'How do I refer a friend?',
    answer: "Use the 'Refer Friend' option in the menu to invite others to join V-Care."
  },
  {
    question: 'How do I manage my profile?',
    answer: "Go to 'My Profile' to update your information and view your donation history."
  }
];

const FAQAccordionItem = ({ item, expanded, onToggle }) => (
  <View style={styles.accordionItem}>
    <TouchableOpacity onPress={onToggle} style={[styles.itemHeader, expanded && styles.itemHeaderExpanded]} activeOpacity={0.85}>
      <Text style={[styles.question, expanded && styles.questionExpanded]}>{item.question}</Text>
      <MaterialCommunityIcons
        name={expanded ? 'chevron-up' : 'chevron-down'}
        size={22}
        color={expanded ? '#D32F2F' : '#94A3B8'}
      />
    </TouchableOpacity>
    {expanded && (
      <View style={styles.expandedContent}>
        <Text style={styles.expandedText}>{item.answer}</Text>
      </View>
    )}
  </View>
);

export default function FAQScreen() {
  const [expandedIndex, setExpandedIndex] = useState(null);
  const toggleIndex = (i) => setExpandedIndex(prev => (prev === i ? null : i));

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 120 }}>
      <View style={styles.header}>
        <Title style={styles.title}>Frequently Asked Questions</Title>
        <Text style={styles.subtitle}>Find quick answers about blood donation & V-Care app features.</Text>
      </View>

      <View style={styles.faqList}>
        {faqList.map((item, idx) => (
          <FAQAccordionItem
            key={idx}
            item={item}
            expanded={expandedIndex === idx}
            onToggle={() => toggleIndex(idx)}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
  },
  title: {
    color: '#0F172A',
    fontSize: 24,
    marginBottom: 6,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  faqList: {
    padding: 16,
  },
  question: {
    fontWeight: '700',
    fontSize: 15,
    color: '#0F172A',
    flex: 1,
    marginRight: 8,
  },
  accordionItem: {
    marginBottom: 10,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 1,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
  },
  itemHeaderExpanded: {
    borderColor: '#FFCDD2',
    backgroundColor: '#FFFFFF',
  },
  questionExpanded: {
    color: '#D32F2F',
  },
  expandedContent: {
    marginTop: 6,
    padding: 16,
    backgroundColor: '#FFEBEE',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  expandedText: {
    color: '#334155',
    lineHeight: 22,
    fontSize: 14,
  },
});