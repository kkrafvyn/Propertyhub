/**
 * Signup Screen
 * 
 * User registration screen with form validation
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text, useTheme, HelperText, Checkbox } from 'react-native-paper';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { showMessage } from 'react-native-flash-message';

import { useAuth } from '../../src/providers/AuthProvider';

export default function SignupScreen() {
  const theme = useTheme();
  const { signUp, isLoading } = useAuth();
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    if (!formData.phone) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\+?[\d\s\-\(\)]+$/.test(formData.phone)) {
      newErrors.phone = 'Invalid phone number format';
    }
    
    if (!agreeToTerms) {
      newErrors.terms = 'You must agree to the terms and conditions';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async () => {
    if (!validateForm()) return;

    try {
      await signUp({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
      });
      
      showMessage({
        message: 'Account created successfully! Welcome to PropertyHub!',
        type: 'success',
      });
      
      router.replace('/(tabs)');
    } catch (error) {
      showMessage({
        message: 'Registration failed. Please try again.',
        type: 'danger',
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.gradient}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <Animated.View 
              entering={FadeInUp.delay(200).duration(1000)}
              style={styles.header}
            >
              <Button
                mode="text"
                onPress={() => router.back()}
                style={styles.backButton}
                labelStyle={{ color: 'white' }}
                icon={({ size }) => (
                  <Ionicons name="arrow-back" size={size} color="white" />
                )}
              >
                Back
              </Button>
              
              <Text variant="headlineMedium" style={styles.title}>
                Create Account
              </Text>
              <Text variant="bodyLarge" style={styles.subtitle}>
                Join PropertyHub and find your dream property
              </Text>
            </Animated.View>

            {/* Signup Form */}
            <Animated.View 
              entering={FadeInDown.delay(400).duration(1000)}
              style={styles.formContainer}
            >
              <View style={styles.form}>
                <View style={styles.nameRow}>
                  <View style={styles.nameField}>
                    <TextInput
                      label="First Name"
                      value={formData.firstName}
                      onChangeText={(value) => updateField('firstName', value)}
                      mode="outlined"
                      style={styles.input}
                      autoCapitalize="words"
                      error={!!errors.firstName}
                    />
                    <HelperText type="error" visible={!!errors.firstName}>
                      {errors.firstName}
                    </HelperText>
                  </View>
                  
                  <View style={styles.nameField}>
                    <TextInput
                      label="Last Name"
                      value={formData.lastName}
                      onChangeText={(value) => updateField('lastName', value)}
                      mode="outlined"
                      style={styles.input}
                      autoCapitalize="words"
                      error={!!errors.lastName}
                    />
                    <HelperText type="error" visible={!!errors.lastName}>
                      {errors.lastName}
                    </HelperText>
                  </View>
                </View>

                <TextInput
                  label="Email"
                  value={formData.email}
                  onChangeText={(value) => updateField('email', value)}
                  mode="outlined"
                  style={styles.input}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  error={!!errors.email}
                  left={<TextInput.Icon icon="email" />}
                />
                <HelperText type="error" visible={!!errors.email}>
                  {errors.email}
                </HelperText>

                <TextInput
                  label="Phone Number"
                  value={formData.phone}
                  onChangeText={(value) => updateField('phone', value)}
                  mode="outlined"
                  style={styles.input}
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  error={!!errors.phone}
                  left={<TextInput.Icon icon="phone" />}
                />
                <HelperText type="error" visible={!!errors.phone}>
                  {errors.phone}
                </HelperText>

                <TextInput
                  label="Password"
                  value={formData.password}
                  onChangeText={(value) => updateField('password', value)}
                  mode="outlined"
                  style={styles.input}
                  secureTextEntry={!showPassword}
                  autoComplete="new-password"
                  error={!!errors.password}
                  left={<TextInput.Icon icon="lock" />}
                  right={
                    <TextInput.Icon
                      icon={showPassword ? "eye-off" : "eye"}
                      onPress={() => setShowPassword(!showPassword)}
                    />
                  }
                />
                <HelperText type="error" visible={!!errors.password}>
                  {errors.password}
                </HelperText>

                <TextInput
                  label="Confirm Password"
                  value={formData.confirmPassword}
                  onChangeText={(value) => updateField('confirmPassword', value)}
                  mode="outlined"
                  style={styles.input}
                  secureTextEntry={!showConfirmPassword}
                  error={!!errors.confirmPassword}
                  left={<TextInput.Icon icon="lock-check" />}
                  right={
                    <TextInput.Icon
                      icon={showConfirmPassword ? "eye-off" : "eye"}
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    />
                  }
                />
                <HelperText type="error" visible={!!errors.confirmPassword}>
                  {errors.confirmPassword}
                </HelperText>

                <View style={styles.checkboxContainer}>
                  <Checkbox
                    status={agreeToTerms ? 'checked' : 'unchecked'}
                    onPress={() => setAgreeToTerms(!agreeToTerms)}
                  />
                  <Text style={styles.checkboxText}>
                    I agree to the{' '}
                    <Text style={styles.linkText}>Terms of Service</Text>
                    {' '}and{' '}
                    <Text style={styles.linkText}>Privacy Policy</Text>
                  </Text>
                </View>
                <HelperText type="error" visible={!!errors.terms}>
                  {errors.terms}
                </HelperText>

                <Button
                  mode="contained"
                  onPress={handleSignup}
                  loading={isLoading}
                  disabled={isLoading}
                  style={styles.signupButton}
                  contentStyle={styles.buttonContent}
                  labelStyle={styles.buttonLabel}
                >
                  {isLoading ? 'Creating Account...' : 'Create Account'}
                </Button>
              </View>
            </Animated.View>

            {/* Footer */}
            <Animated.View 
              entering={FadeInDown.delay(600).duration(1000)}
              style={styles.footer}
            >
              <Text style={styles.footerText}>
                Already have an account?{' '}
                <Text 
                  style={styles.linkText}
                  onPress={() => router.push('/(auth)/login')}
                >
                  Sign In
                </Text>
              </Text>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  title: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  form: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 24,
    gap: 8,
  },
  nameRow: {
    flexDirection: 'row',
    gap: 12,
  },
  nameField: {
    flex: 1,
  },
  input: {
    backgroundColor: 'transparent',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  checkboxText: {
    flex: 1,
    fontSize: 14,
  },
  linkText: {
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  signupButton: {
    marginTop: 16,
    borderRadius: 25,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  buttonLabel: {
    fontSize: 18,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    color: 'white',
    fontSize: 16,
  },
});