import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { TextInput, Button, Title, Surface, Text } from 'react-native-paper';
import { sendPasswordResetEmail } from 'firebase/auth';
import { authentication } from '../firebase/config';

const ForgotPasswordScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');

  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!email || !email.includes('@')) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      // Use Firebase Auth's built-in password reset email flow.
      // This sends a secure password-reset link to the user's email.
      await sendPasswordResetEmail(authentication, email);
      Alert.alert(
        'Email sent',
        'A password reset email has been sent to your address. Follow the instructions in that email to reset your password.'
      );
      setLoading(false);
      navigation.goBack();
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      Alert.alert('Error', error.message || 'Failed to send reset email. Please try again.');
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Surface style={styles.surface}>
        <Title style={styles.title}>Reset Password</Title>
        <Text style={styles.description}>
          Enter your email address and we'll send you instructions to reset your password.
        </Text>
        <TextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          mode="outlined"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Button
          mode="contained"
          onPress={handleResetPassword}
          style={styles.button}
        >
          Reset Password
        </Button>
        <Button
          mode="text"
          onPress={() => navigation.goBack()}
          style={styles.button}
        >
          Back to Login
        </Button>
      </Surface>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  surface: {
    padding: 20,
    elevation: 4,
    borderRadius: 10,
  },
  title: {
    textAlign: 'center',
    marginBottom: 20,
  },
  description: {
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
  },
});

export default ForgotPasswordScreen;