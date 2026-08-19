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
    <TouchableOpacity onPress={onToggle} style={styles.itemHeader} activeOpacity={0.85}>
      <Text style={[styles.question, expanded && styles.questionExpanded]}>{item.question}</Text>
      <MaterialCommunityIcons
        name={expanded ? 'chevron-up' : 'chevron-down'}
        size={22}
        color={expanded ? '#0f7a5a' : '#999'}
      />
    </TouchableOpacity>
    {expanded && (
      <Surface style={styles.expandedContent}>
        <Text style={styles.expandedText}>{item.answer}</Text>
      </Surface>
    )}
  </View>
);

export default function FAQScreen() {
  const [expandedIndex, setExpandedIndex] = useState(null);
  const toggleIndex = (i) => setExpandedIndex(prev => (prev === i ? null : i));

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 120 }}>
      <Surface style={styles.header}>
        <Title style={styles.title}>FAQ</Title>
        <Text style={styles.subtitle}>Find answers about blood donation and using the V-Care app.</Text>
      </Surface>

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
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: 'rgb(211, 16, 16)',
    elevation: 4,
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 24,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  faqList: {
    padding: 16,
  },
  faqItem: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 10,
    backgroundColor: '#fff',
    elevation: 2,
  },
  question: {
    fontWeight: 'bold',
    fontSize: 16,
    color: 'rgb(211, 16, 16)',
    marginBottom: 4,
  },
  divider: {
    marginVertical: 6,
  },
  answer: {
    fontSize: 15,
    color: '#333',
    marginTop: 4,
    lineHeight: 22,
  },
  accordionItem: {
    marginBottom: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 1,
  },
  questionExpanded: {
    color: '#0f7a5a',
  },
  expandedContent: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#e9f7ef',
    borderRadius: 8,
    elevation: 0,
  },
  expandedText: {
    color: '#0f4f3a',
    lineHeight: 20,
    fontSize: 15,
  },
});