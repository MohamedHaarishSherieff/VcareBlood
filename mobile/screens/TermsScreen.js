import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Title, Paragraph, Surface } from 'react-native-paper';

const TermsScreen = () => {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Surface style={styles.surface}>
        <Title style={styles.title}>Terms & Conditions</Title>
        <Paragraph style={styles.paragraph}>
          Thank you for using V-Care. By using this app you agree to the following terms:
        </Paragraph>
        <Paragraph style={styles.paragraph}>
          1. Donations: All donations are voluntary. Donations will be used to cover app hosting, maintenance, and development of new features. We will make reasonable efforts to use funds to improve the service.
        </Paragraph>
        <Paragraph style={styles.paragraph}>
          2. Privacy: We respect your privacy. Personal details you provide while using the app will be handled according to our privacy policy.
        </Paragraph>
        <Paragraph style={styles.paragraph}>
          3. Liability: V-Care provides information to help users connect. We are not responsible for outcomes of interactions or actions taken based on app content.
        </Paragraph>
        <Paragraph style={styles.paragraph}>
          4. Refunds: Donations are non-refundable unless otherwise stated.
        </Paragraph>
        <Paragraph style={styles.paragraph}>
          For questions about these terms contact the V-Care team.
        </Paragraph>
      </Surface>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 120 },
  surface: { padding: 16, borderRadius: 8 },
  title: { textAlign: 'center', marginBottom: 12 },
  paragraph: { marginBottom: 10, color: '#333', lineHeight: 20 },
});

export default TermsScreen;
