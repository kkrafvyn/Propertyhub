import { ValidationRule, FormFieldError, ValidationResult, ErrorDetails } from '../types';
import { errorTracker } from './errorTracking';

/**
 * Enhanced Validation System
 * Provides comprehensive form validation with specific error messages
 */

export class ValidationSystem {
  private static instance: ValidationSystem;

  static getInstance(): ValidationSystem {
    if (!ValidationSystem.instance) {
      ValidationSystem.instance = new ValidationSystem();
    }
    return ValidationSystem.instance;
  }

  // Email validation with specific error messages
  validateEmail(email: string, fieldName = 'email'): FormFieldError | null {
    if (!email || email.trim() === '') {
      return {
        field: fieldName,
        message: 'Email address is required for account access and notifications',
        code: 'EMAIL_REQUIRED'
      };
    }

    const trimmedEmail = email.trim();
    
    if (trimmedEmail.length < 5) {
      return {
        field: fieldName,
        message: 'Email address must be at least 5 characters long',
        code: 'EMAIL_TOO_SHORT'
      };
    }

    if (trimmedEmail.length > 254) {
      return {
        field: fieldName,
        message: 'Email address cannot exceed 254 characters',
        code: 'EMAIL_TOO_LONG'
      };
    }

    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    
    if (!emailRegex.test(trimmedEmail)) {
      return {
        field: fieldName,
        message: 'Please enter a valid email address (e.g., user@example.com)',
        code: 'EMAIL_INVALID_FORMAT'
      };
    }

    return null;
  }

  // Password validation with specific requirements
  validatePassword(password: string, fieldName = 'password'): FormFieldError | null {
    if (!password) {
      return {
        field: fieldName,
        message: 'Password is required to secure your account',
        code: 'PASSWORD_REQUIRED'
      };
    }

    if (password.length < 8) {
      return {
        field: fieldName,
        message: 'Password must be at least 8 characters long for security',
        code: 'PASSWORD_TOO_SHORT'
      };
    }

    if (password.length > 128) {
      return {
        field: fieldName,
        message: 'Password cannot exceed 128 characters',
        code: 'PASSWORD_TOO_LONG'
      };
    }

    if (!/[a-z]/.test(password)) {
      return {
        field: fieldName,
        message: 'Password must contain at least one lowercase letter',
        code: 'PASSWORD_NO_LOWERCASE'
      };
    }

    if (!/[A-Z]/.test(password)) {
      return {
        field: fieldName,
        message: 'Password must contain at least one uppercase letter',
        code: 'PASSWORD_NO_UPPERCASE'
      };
    }

    if (!/\d/.test(password)) {
      return {
        field: fieldName,
        message: 'Password must contain at least one number',
        code: 'PASSWORD_NO_NUMBER'
      };
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      return {
        field: fieldName,
        message: 'Password must contain at least one special character (!@#$%^&*)',
        code: 'PASSWORD_NO_SPECIAL'
      };
    }

    // Check for common weak passwords
    const commonPasswords = ['password', '12345678', 'qwerty123', 'password123', 'admin123'];
    if (commonPasswords.includes(password.toLowerCase())) {
      return {
        field: fieldName,
        message: 'This password is too common. Please choose a more unique password',
        code: 'PASSWORD_TOO_COMMON'
      };
    }

    return null;
  }

  // Name validation
  validateName(name: string, fieldName = 'name'): FormFieldError | null {
    if (!name || name.trim() === '') {
      return {
        field: fieldName,
        message: 'Name is required for your profile and communications',
        code: 'NAME_REQUIRED'
      };
    }

    const trimmedName = name.trim();

    if (trimmedName.length < 2) {
      return {
        field: fieldName,
        message: 'Name must be at least 2 characters long',
        code: 'NAME_TOO_SHORT'
      };
    }

    if (trimmedName.length > 50) {
      return {
        field: fieldName,
        message: 'Name cannot exceed 50 characters',
        code: 'NAME_TOO_LONG'
      };
    }

    if (!/^[a-zA-Z\s\-'\.]+$/.test(trimmedName)) {
      return {
        field: fieldName,
        message: 'Name can only contain letters, spaces, hyphens, apostrophes, and periods',
        code: 'NAME_INVALID_CHARACTERS'
      };
    }

    return null;
  }

  // Phone number validation
  validatePhone(phone: string, fieldName = 'phone'): FormFieldError | null {
    if (!phone || phone.trim() === '') {
      return {
        field: fieldName,
        message: 'Phone number is required for booking confirmations and support',
        code: 'PHONE_REQUIRED'
      };
    }

    const cleanPhone = phone.replace(/\D/g, ''); // Remove all non-digits

    if (cleanPhone.length < 10) {
      return {
        field: fieldName,
        message: 'Phone number must be at least 10 digits long',
        code: 'PHONE_TOO_SHORT'
      };
    }

    if (cleanPhone.length > 15) {
      return {
        field: fieldName,
        message: 'Phone number cannot exceed 15 digits',
        code: 'PHONE_TOO_LONG'
      };
    }

    // Ghana-specific phone validation
    if (cleanPhone.startsWith('233')) {
      if (cleanPhone.length !== 12) {
        return {
          field: fieldName,
          message: 'Ghana phone number with country code must be 12 digits (233XXXXXXXXX)',
          code: 'PHONE_GHANA_INVALID_LENGTH'
        };
      }
    } else if (cleanPhone.startsWith('0')) {
      if (cleanPhone.length !== 10) {
        return {
          field: fieldName,
          message: 'Ghana phone number must be 10 digits (0XXXXXXXXX)',
          code: 'PHONE_GHANA_LOCAL_INVALID_LENGTH'
        };
      }
    }

    return null;
  }

  // Property price validation
  validatePrice(price: number | string, fieldName = 'price'): FormFieldError | null {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;

    if (numPrice === undefined || numPrice === null || isNaN(numPrice)) {
      return {
        field: fieldName,
        message: 'Price is required for property listings',
        code: 'PRICE_REQUIRED'
      };
    }

    if (numPrice < 0) {
      return {
        field: fieldName,
        message: 'Price cannot be negative',
        code: 'PRICE_NEGATIVE'
      };
    }

    if (numPrice === 0) {
      return {
        field: fieldName,
        message: 'Price must be greater than zero',
        code: 'PRICE_ZERO'
      };
    }

    if (numPrice > 10000000) { // 10 million GHS
      return {
        field: fieldName,
        message: 'Price cannot exceed GHS 10,000,000. Please contact support for high-value properties',
        code: 'PRICE_TOO_HIGH'
      };
    }

    if (numPrice < 50) { // Minimum 50 GHS
      return {
        field: fieldName,
        message: 'Price must be at least GHS 50',
        code: 'PRICE_TOO_LOW'
      };
    }

    return null;
  }

  // Property area validation
  validateArea(area: number | string, fieldName = 'area'): FormFieldError | null {
    const numArea = typeof area === 'string' ? parseFloat(area) : area;

    if (numArea === undefined || numArea === null || isNaN(numArea)) {
      return {
        field: fieldName,
        message: 'Property area is required for accurate listings',
        code: 'AREA_REQUIRED'
      };
    }

    if (numArea <= 0) {
      return {
        field: fieldName,
        message: 'Property area must be greater than zero',
        code: 'AREA_INVALID'
      };
    }

    if (numArea > 1000000) { // 1 million sq meters
      return {
        field: fieldName,
        message: 'Property area cannot exceed 1,000,000 square meters',
        code: 'AREA_TOO_LARGE'
      };
    }

    if (numArea < 1) {
      return {
        field: fieldName,
        message: 'Property area must be at least 1 square meter',
        code: 'AREA_TOO_SMALL'
      };
    }

    return null;
  }

  // Property description validation
  validateDescription(description: string, fieldName = 'description'): FormFieldError | null {
    if (!description || description.trim() === '') {
      return {
        field: fieldName,
        message: 'Property description is required to help potential buyers understand your property',
        code: 'DESCRIPTION_REQUIRED'
      };
    }

    const trimmedDescription = description.trim();

    if (trimmedDescription.length < 20) {
      return {
        field: fieldName,
        message: 'Property description must be at least 20 characters to provide meaningful information',
        code: 'DESCRIPTION_TOO_SHORT'
      };
    }

    if (trimmedDescription.length > 2000) {
      return {
        field: fieldName,
        message: 'Property description cannot exceed 2000 characters',
        code: 'DESCRIPTION_TOO_LONG'
      };
    }

    return null;
  }

  // Search query validation
  validateSearchQuery(query: string, fieldName = 'search'): FormFieldError | null {
    if (!query || query.trim() === '') {
      return {
        field: fieldName,
        message: 'Please enter a location, property type, or keyword to search',
        code: 'SEARCH_QUERY_REQUIRED'
      };
    }

    const trimmedQuery = query.trim();

    if (trimmedQuery.length < 2) {
      return {
        field: fieldName,
        message: 'Search query must be at least 2 characters long',
        code: 'SEARCH_QUERY_TOO_SHORT'
      };
    }

    if (trimmedQuery.length > 100) {
      return {
        field: fieldName,
        message: 'Search query cannot exceed 100 characters',
        code: 'SEARCH_QUERY_TOO_LONG'
      };
    }

    return null;
  }

  // Payment amount validation
  validatePaymentAmount(amount: number | string, fieldName = 'amount'): FormFieldError | null {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

    if (numAmount === undefined || numAmount === null || isNaN(numAmount)) {
      return {
        field: fieldName,
        message: 'Payment amount is required to process your transaction',
        code: 'PAYMENT_AMOUNT_REQUIRED'
      };
    }

    if (numAmount <= 0) {
      return {
        field: fieldName,
        message: 'Payment amount must be greater than zero',
        code: 'PAYMENT_AMOUNT_INVALID'
      };
    }

    if (numAmount < 1) {
      return {
        field: fieldName,
        message: 'Minimum payment amount is GHS 1.00',
        code: 'PAYMENT_AMOUNT_TOO_LOW'
      };
    }

    if (numAmount > 500000) { // 500k GHS
      return {
        field: fieldName,
        message: 'Payment amount cannot exceed GHS 500,000. Please contact support for large transactions',
        code: 'PAYMENT_AMOUNT_TOO_HIGH'
      };
    }

    return null;
  }

  // Comprehensive form validation
  validateForm(data: Record<string, unknown>, rules: Record<string, ValidationRule[]>): ValidationResult {
    const errors: FormFieldError[] = [];
    const warnings: FormFieldError[] = [];

    for (const [fieldName, fieldRules] of Object.entries(rules)) {
      const fieldValue = data[fieldName];

      for (const rule of fieldRules) {
        let error: FormFieldError | null = null;

        // Required validation
        if (rule.required && (fieldValue === undefined || fieldValue === null || fieldValue === '')) {
          error = {
            field: fieldName,
            message: rule.message || `${fieldName} is required`,
            code: 'FIELD_REQUIRED'
          };
        }

        // Length validations
        if (!error && fieldValue && typeof fieldValue === 'string') {
          if (rule.minLength && fieldValue.length < rule.minLength) {
            error = {
              field: fieldName,
              message: rule.message || `${fieldName} must be at least ${rule.minLength} characters`,
              code: 'FIELD_TOO_SHORT'
            };
          }

          if (rule.maxLength && fieldValue.length > rule.maxLength) {
            error = {
              field: fieldName,
              message: rule.message || `${fieldName} cannot exceed ${rule.maxLength} characters`,
              code: 'FIELD_TOO_LONG'
            };
          }
        }

        // Pattern validation
        if (!error && fieldValue && typeof fieldValue === 'string' && rule.pattern) {
          if (!rule.pattern.test(fieldValue)) {
            error = {
              field: fieldName,
              message: rule.message || `${fieldName} format is invalid`,
              code: 'FIELD_INVALID_FORMAT'
            };
          }
        }

        // Custom validation
        if (!error && rule.custom && fieldValue !== undefined && fieldValue !== null) {
          const customResult = rule.custom(fieldValue);
          if (customResult !== true) {
            error = {
              field: fieldName,
              message: typeof customResult === 'string' ? customResult : (rule.message || `${fieldName} is invalid`),
              code: 'FIELD_CUSTOM_VALIDATION_FAILED'
            };
          }
        }

        if (error) {
          errors.push(error);
          // Log validation errors for analytics
          errorTracker.logValidationError(fieldName, fieldValue, JSON.stringify(rule));
          break; // Stop at first error for this field
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // Specific validation methods for common PropertyHub forms
  validateLoginForm(email: string, password: string): ValidationResult {
    const errors: FormFieldError[] = [];

    const emailError = this.validateEmail(email);
    if (emailError) errors.push(emailError);

    if (!password) {
      errors.push({
        field: 'password',
        message: 'Password is required to access your account',
        code: 'PASSWORD_REQUIRED'
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  validateSignupForm(name: string, email: string, password: string, phone?: string): ValidationResult {
    const errors: FormFieldError[] = [];

    const nameError = this.validateName(name);
    if (nameError) errors.push(nameError);

    const emailError = this.validateEmail(email);
    if (emailError) errors.push(emailError);

    const passwordError = this.validatePassword(password);
    if (passwordError) errors.push(passwordError);

    if (phone) {
      const phoneError = this.validatePhone(phone);
      if (phoneError) errors.push(phoneError);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  validatePropertyForm(data: {
    title: string;
    description: string;
    price: number | string;
    area: number | string;
    location: string;
  }): ValidationResult {
    const errors: FormFieldError[] = [];

    // Title validation
    if (!data.title || data.title.trim() === '') {
      errors.push({
        field: 'title',
        message: 'Property title is required to attract potential buyers',
        code: 'TITLE_REQUIRED'
      });
    } else if (data.title.trim().length < 10) {
      errors.push({
        field: 'title',
        message: 'Property title must be at least 10 characters to be descriptive',
        code: 'TITLE_TOO_SHORT'
      });
    } else if (data.title.trim().length > 100) {
      errors.push({
        field: 'title',
        message: 'Property title cannot exceed 100 characters',
        code: 'TITLE_TOO_LONG'
      });
    }

    const descriptionError = this.validateDescription(data.description);
    if (descriptionError) errors.push(descriptionError);

    const priceError = this.validatePrice(data.price);
    if (priceError) errors.push(priceError);

    const areaError = this.validateArea(data.area);
    if (areaError) errors.push(areaError);

    // Location validation
    if (!data.location || data.location.trim() === '') {
      errors.push({
        field: 'location',
        message: 'Property location is required for buyers to find your property',
        code: 'LOCATION_REQUIRED'
      });
    } else if (data.location.trim().length < 5) {
      errors.push({
        field: 'location',
        message: 'Property location must be at least 5 characters (e.g., "Accra, Ghana")',
        code: 'LOCATION_TOO_SHORT'
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  validateSearchFilters(filters: {
    priceRange?: [number, number];
    areaRange?: [number, number];
    bedrooms?: string[];
    bathrooms?: string[];
  }): ValidationResult {
    const errors: FormFieldError[] = [];

    // Price range validation
    if (filters.priceRange) {
      const [minPrice, maxPrice] = filters.priceRange;
      if (minPrice < 0) {
        errors.push({
          field: 'priceRange',
          message: 'Minimum price cannot be negative',
          code: 'PRICE_RANGE_MIN_NEGATIVE'
        });
      }
      if (maxPrice < minPrice) {
        errors.push({
          field: 'priceRange',
          message: 'Maximum price must be greater than minimum price',
          code: 'PRICE_RANGE_INVALID'
        });
      }
      if (maxPrice > 10000000) {
        errors.push({
          field: 'priceRange',
          message: 'Maximum price cannot exceed GHS 10,000,000',
          code: 'PRICE_RANGE_TOO_HIGH'
        });
      }
    }

    // Area range validation
    if (filters.areaRange) {
      const [minArea, maxArea] = filters.areaRange;
      if (minArea < 0) {
        errors.push({
          field: 'areaRange',
          message: 'Minimum area cannot be negative',
          code: 'AREA_RANGE_MIN_NEGATIVE'
        });
      }
      if (maxArea < minArea) {
        errors.push({
          field: 'areaRange',
          message: 'Maximum area must be greater than minimum area',
          code: 'AREA_RANGE_INVALID'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export const validationSystem = ValidationSystem.getInstance();

// React hook for form validation
export function useFormValidation() {
  const validateField = (
    fieldName: string,
    value: unknown,
    rules: ValidationRule[]
  ): FormFieldError | null => {
    const result = validationSystem.validateForm(
      { [fieldName]: value },
      { [fieldName]: rules }
    );
    return result.errors[0] || null;
  };

  const validateForm = (
    data: Record<string, unknown>,
    rules: Record<string, ValidationRule[]>
  ): ValidationResult => {
    return validationSystem.validateForm(data, rules);
  };

  return {
    validateField,
    validateForm,
    validateEmail: validationSystem.validateEmail.bind(validationSystem),
    validatePassword: validationSystem.validatePassword.bind(validationSystem),
    validateName: validationSystem.validateName.bind(validationSystem),
    validatePhone: validationSystem.validatePhone.bind(validationSystem),
    validatePrice: validationSystem.validatePrice.bind(validationSystem),
    validateLoginForm: validationSystem.validateLoginForm.bind(validationSystem),
    validateSignupForm: validationSystem.validateSignupForm.bind(validationSystem)
  };
}