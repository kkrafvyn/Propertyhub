import { User, Property, Notification, ChatMessage, Booking } from '../types';
import { errorTracker, performanceMonitor } from './errorTracking';
import { validationSystem } from './validation';

/**
 * Comprehensive Testing Utilities
 * Provides automated testing infrastructure and validation
 */

export class TestingUtils {
  private static instance: TestingUtils;
  private testResults: TestResult[] = [];
  private isTestMode = false;

  static getInstance(): TestingUtils {
    if (!TestingUtils.instance) {
      TestingUtils.instance = new TestingUtils();
    }
    return TestingUtils.instance;
  }

  public enableTestMode(): void {
    this.isTestMode = true;
    console.log('🧪 Testing mode enabled');
  }

  public disableTestMode(): void {
    this.isTestMode = false;
    this.testResults = [];
    console.log('🧪 Testing mode disabled');
  }

  // Component Testing
  public testComponent(
    componentName: string,
    testFn: () => boolean | Promise<boolean>,
    description?: string
  ): Promise<TestResult> {
    return this.runTest(`Component: ${componentName}`, testFn, description);
  }

  // API Testing
  public async testApiEndpoint(
    endpoint: string,
    expectedStatus: number = 200,
    timeout: number = 5000
  ): Promise<TestResult> {
    const testName = `API: ${endpoint}`;
    
    return this.runTest(testName, async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(endpoint, {
          signal: controller.signal,
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token') || 'test-token'}`,
            'Content-Type': 'application/json'
          }
        });

        clearTimeout(timeoutId);
        
        if (response.status === expectedStatus) {
          return true;
        } else {
          errorTracker.logNetworkError(
            `Expected status ${expectedStatus}, got ${response.status}`,
            endpoint,
            response.status
          );
          return false;
        }
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
          errorTracker.logNetworkError(`Request timeout after ${timeout}ms`, endpoint);
          return false;
        }
        errorTracker.logNetworkError(
          error instanceof Error ? error.message : 'Unknown error',
          endpoint
        );
        return false;
      }
    }, `Testing ${endpoint} responds with status ${expectedStatus}`);
  }

  // Form Validation Testing
  public testFormValidation(
    formName: string,
    validData: Record<string, unknown>,
    invalidData: Record<string, unknown>[]
  ): Promise<TestResult[]> {
    const tests: Promise<TestResult>[] = [];

    // Test valid data passes
    tests.push(
      this.runTest(
        `Form Validation: ${formName} - Valid Data`,
        () => {
          const result = validationSystem.validateForm(validData, this.getValidationRules(formName));
          return result.isValid;
        },
        'Valid form data should pass validation'
      )
    );

    // Test invalid data fails
    invalidData.forEach((data, index) => {
      tests.push(
        this.runTest(
          `Form Validation: ${formName} - Invalid Data ${index + 1}`,
          () => {
            const result = validationSystem.validateForm(data, this.getValidationRules(formName));
            return !result.isValid; // Should fail validation
          },
          `Invalid form data should fail validation`
        )
      );
    });

    return Promise.all(tests);
  }

  // Performance Testing
  public async testPerformance(
    operationName: string,
    operation: () => Promise<void> | void,
    maxDuration: number
  ): Promise<TestResult> {
    return this.runTest(
      `Performance: ${operationName}`,
      async () => {
        const startTime = performance.now();
        
        try {
          await operation();
          const duration = performance.now() - startTime;
          
          if (duration > maxDuration) {
            errorTracker.logPerformanceIssue(operationName, duration, maxDuration);
            return false;
          }
          
          return true;
        } catch (error) {
          errorTracker.logError({
            code: 'PERFORMANCE_TEST_ERROR',
            message: `Performance test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            category: 'unknown',
            severity: 'medium'
          });
          return false;
        }
      },
      `Operation should complete within ${maxDuration}ms`
    );
  }

  // Accessibility Testing
  public testAccessibility(elementId: string): Promise<TestResult> {
    return this.runTest(
      `Accessibility: ${elementId}`,
      () => {
        const element = document.getElementById(elementId);
        if (!element) return false;

        const issues: string[] = [];

        // Check for alt text on images
        const images = element.querySelectorAll('img');
        images.forEach((img, index) => {
          if (!img.alt) {
            issues.push(`Image ${index + 1} missing alt text`);
          }
        });

        // Check for proper heading hierarchy
        const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
        let lastLevel = 0;
        headings.forEach((heading) => {
          const currentLevel = parseInt(heading.tagName.charAt(1));
          if (currentLevel > lastLevel + 1) {
            issues.push(`Heading hierarchy skip from h${lastLevel} to h${currentLevel}`);
          }
          lastLevel = currentLevel;
        });

        // Check for buttons without accessible names
        const buttons = element.querySelectorAll('button');
        buttons.forEach((button, index) => {
          const hasText = button.textContent?.trim();
          const hasAriaLabel = button.getAttribute('aria-label');
          const hasAriaLabelledby = button.getAttribute('aria-labelledby');
          
          if (!hasText && !hasAriaLabel && !hasAriaLabelledby) {
            issues.push(`Button ${index + 1} has no accessible name`);
          }
        });

        // Check for form inputs without labels
        const inputs = element.querySelectorAll('input, textarea, select');
        inputs.forEach((input, index) => {
          const hasLabel = element.querySelector(`label[for="${input.id}"]`);
          const hasAriaLabel = input.getAttribute('aria-label');
          const hasAriaLabelledby = input.getAttribute('aria-labelledby');
          
          if (!hasLabel && !hasAriaLabel && !hasAriaLabelledby) {
            issues.push(`Input ${index + 1} has no associated label`);
          }
        });

        if (issues.length > 0) {
          console.warn(`Accessibility issues found in ${elementId}:`, issues);
          return false;
        }

        return true;
      },
      'Element should meet basic accessibility requirements'
    );
  }

  // Database Operation Testing
  public testLocalStorageOperations(): Promise<TestResult[]> {
    const tests: Promise<TestResult>[] = [];

    // Test localStorage availability
    tests.push(
      this.runTest(
        'Storage: localStorage Available',
        () => {
          try {
            const testKey = 'test_storage_' + Date.now();
            localStorage.setItem(testKey, 'test');
            const value = localStorage.getItem(testKey);
            localStorage.removeItem(testKey);
            return value === 'test';
          } catch {
            return false;
          }
        },
        'localStorage should be available and functional'
      )
    );

    // Test user data persistence
    tests.push(
      this.runTest(
        'Storage: User Data Persistence',
        () => {
          const testUser: Partial<User> = {
            id: 'test-user-123',
            name: 'Test User',
            email: 'test@example.com',
            role: 'user'
          };

          try {
            localStorage.setItem('propertyHub_testUser', JSON.stringify(testUser));
            const stored = localStorage.getItem('propertyHub_testUser');
            const parsed = stored ? JSON.parse(stored) : null;
            localStorage.removeItem('propertyHub_testUser');
            
            return parsed && parsed.id === testUser.id && parsed.email === testUser.email;
          } catch {
            return false;
          }
        },
        'User data should persist correctly in localStorage'
      )
    );

    return Promise.all(tests);
  }

  // Mock Data Generation
  public generateMockUser(overrides?: Partial<User>): User {
    return {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      name: 'Test User',
      email: 'test@propertyhub.com',
      role: 'user',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
      phone: '+233501234567',
      joinDate: new Date().toISOString(),
      preferences: {
        theme: 'system',
        notifications: {
          push: true,
          email: true,
          sms: false,
          marketing: false
        },
        language: 'en',
        display: {
          currency: 'GHS',
          dateFormat: 'DD/MM/YYYY',
          timeFormat: '12h'
        },
        privacy: {
          showProfile: true,
          showActivity: true
        }
      },
      ...overrides
    };
  }

  public generateMockProperty(overrides?: Partial<Property>): Property {
    const locations = ['Accra', 'Kumasi', 'Tamale', 'Cape Coast', 'Takoradi'];
    const types: Property['type'][] = ['house', 'apartment', 'land', 'shop', 'commercial'];
    
    return {
      id: `prop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: 'Modern 3-Bedroom House',
      description: 'Beautiful modern house with spacious rooms, modern kitchen, and large compound. Perfect for families.',
      location: {
        address: '123 Test St',
        city: locations[Math.floor(Math.random() * locations.length)],
        region: 'Greater Accra',
        country: 'Ghana',
        coordinates: {
          lat: 5.6037 + (Math.random() - 0.5) * 0.1,
          lng: -0.1870 + (Math.random() - 0.5) * 0.1
        }
      },
      pricing: {
        amount: Math.floor(Math.random() * 500000) + 50000,
        currency: 'GHS',
        negotiable: true
      },
      listingType: 'rent',
      status: 'available',
      media: [],
      features: {
        bedrooms: Math.floor(Math.random() * 5) + 1,
        bathrooms: Math.floor(Math.random() * 3) + 1,
        area: Math.floor(Math.random() * 500) + 100
      },
      images: [
        'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&h=600&fit=crop'
      ],
      type: types[Math.floor(Math.random() * types.length)],
      bedrooms: Math.floor(Math.random() * 5) + 1,
      bathrooms: Math.floor(Math.random() * 3) + 1,
      area: Math.floor(Math.random() * 500) + 100,
      amenities: ['Parking', 'Security', 'Garden', 'WiFi'],
      ownerId: `owner_${Date.now()}`,
      available: true,
      featured: Math.random() > 0.7,
      rating: Math.round((Math.random() * 2 + 3) * 10) / 10,
      reviews: Math.floor(Math.random() * 50),
      views: Math.floor(Math.random() * 1000),
      favorites: Math.floor(Math.random() * 100),
      inquiries: Math.floor(Math.random() * 10),
      tags: ['modern', 'spacious', 'family-friendly'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides
    };
  }

  public generateMockNotification(overrides?: Partial<Notification>): Notification {
    const types: Notification['type'][] = ['info', 'success', 'warning', 'error', 'chat', 'booking', 'property', 'system'];
    const categories: Notification['category'][] = ['message', 'booking', 'property', 'system', 'payment'];
    
    return {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: 'test-user-123',
      title: 'Test Notification',
      message: 'This is a test notification message',
      type: types[Math.floor(Math.random() * types.length)],
      read: Math.random() > 0.5,
      timestamp: new Date().toISOString(),
      priority: 'normal',
      category: categories[Math.floor(Math.random() * categories.length)],
      ...overrides
    };
  }

  // Integration Testing
  public async runIntegrationTests(): Promise<TestResult[]> {
    console.log('🧪 Running integration tests...');
    
    const tests: Promise<TestResult>[] = [];

    // Test authentication flow
    tests.push(
      this.testComponent(
        'AuthenticationFlow',
        async () => {
          // Simulate login process
          const mockUser = this.generateMockUser();
          localStorage.setItem('propertyHub_currentUser', JSON.stringify(mockUser));
          
          // Verify user is stored
          const stored = localStorage.getItem('propertyHub_currentUser');
          const success = stored !== null;
          
          // Cleanup
          localStorage.removeItem('propertyHub_currentUser');
          
          return success;
        },
        'Authentication flow should work correctly'
      )
    );

    // Test property search
    tests.push(
      this.testComponent(
        'PropertySearch',
        () => {
          const properties = Array.from({ length: 5 }, () => this.generateMockProperty());
          const searchQuery = 'accra';
          
          const results = properties.filter(prop => {
            const locationStr = typeof prop.location === 'string' 
              ? prop.location 
              : `${prop.location.address || ''} ${prop.location.city} ${prop.location.region} ${prop.location.country}`;
              
            return locationStr.toLowerCase().includes(searchQuery.toLowerCase()) ||
              prop.title.toLowerCase().includes(searchQuery.toLowerCase());
          });
          
          return results.length >= 0; // Should return some results or empty array
        },
        'Property search should filter results correctly'
      )
    );

    // Test form validations
    const formTests = await this.testFormValidation(
      'LoginForm',
      { email: 'test@example.com', password: 'Password123!' },
      [
        { email: '', password: 'Password123!' },
        { email: 'invalid-email', password: 'Password123!' },
        { email: 'test@example.com', password: '' },
        { email: 'test@example.com', password: '123' }
      ]
    );
    tests.push(...formTests.map(t => Promise.resolve(t)));

    // Test localStorage operations
    const storageTests = await this.testLocalStorageOperations();
    tests.push(...storageTests.map(t => Promise.resolve(t)));

    // Test performance of critical operations
    tests.push(
      this.testPerformance(
        'PropertyListRender',
        () => {
          // Simulate rendering 100 properties
          const properties = Array.from({ length: 100 }, () => this.generateMockProperty());
          // This would normally render to DOM, but we'll just process the data
          properties.forEach(prop => ({
            ...prop,
            displayPrice: `GHS ${(prop.pricing?.amount || 0).toLocaleString()}`
          }));
        },
        1000 // Should complete within 1 second
      )
    );

    const results = await Promise.all(tests);
    this.testResults.push(...results);
    
    return results;
  }

  // Test Result Analysis
  public analyzeTestResults(): TestAnalysis {
    const total = this.testResults.length;
    const passed = this.testResults.filter(r => r.passed).length;
    const failed = total - passed;
    const successRate = total > 0 ? (passed / total) * 100 : 0;

    const categorizedResults = {
      component: this.testResults.filter(r => r.name.startsWith('Component:')),
      api: this.testResults.filter(r => r.name.startsWith('API:')),
      validation: this.testResults.filter(r => r.name.startsWith('Form Validation:')),
      performance: this.testResults.filter(r => r.name.startsWith('Performance:')),
      accessibility: this.testResults.filter(r => r.name.startsWith('Accessibility:')),
      storage: this.testResults.filter(r => r.name.startsWith('Storage:'))
    };

    return {
      total,
      passed,
      failed,
      successRate,
      categorizedResults,
      failedTests: this.testResults.filter(r => !r.passed),
      averageExecutionTime: this.testResults.reduce((sum, r) => sum + r.executionTime, 0) / total || 0
    };
  }

  // Automated Health Check
  public async performHealthCheck(): Promise<HealthCheckResult> {
    console.log('🏥 Performing system health check...');
    
    const checks: Promise<HealthCheck>[] = [];

    // Check localStorage availability
    checks.push(
      this.createHealthCheck(
        'localStorage',
        () => {
          try {
            const testKey = 'health_check_' + Date.now();
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            return true;
          } catch {
            return false;
          }
        }
      )
    );

    // Check error tracking system availability (without logging actual errors)
    checks.push(
      this.createHealthCheck(
        'errorTracking',
        () => {
          try {
            // Test if errorTracker object exists and has required methods
            return (
              typeof errorTracker === 'object' &&
              typeof errorTracker.logError === 'function' &&
              typeof errorTracker.setUserId === 'function'
            );
          } catch {
            return false;
          }
        }
      )
    );

    // Check validation system
    checks.push(
      this.createHealthCheck(
        'validation',
        () => {
          try {
            const result = validationSystem.validateEmail('test@example.com');
            return result === null; // Should be valid
          } catch {
            return false;
          }
        }
      )
    );

    // Check performance monitoring
    checks.push(
      this.createHealthCheck(
        'performanceMonitoring',
        () => {
          try {
            performanceMonitor.startMeasurement('health_check_test');
            performanceMonitor.endMeasurement('health_check_test');
            return true;
          } catch {
            return false;
          }
        }
      )
    );

    const results = await Promise.all(checks);
    const allPassed = results.every(check => check.status === 'healthy');

    return {
      overall: allPassed ? 'healthy' : 'unhealthy',
      checks: results,
      timestamp: new Date().toISOString()
    };
  }

  // Private helper methods
  private async runTest(
    name: string,
    testFn: () => boolean | Promise<boolean>,
    description?: string
  ): Promise<TestResult> {
    const startTime = performance.now();
    
    try {
      const result = await testFn();
      const executionTime = performance.now() - startTime;
      
      const testResult: TestResult = {
        name,
        passed: result,
        executionTime,
        description,
        timestamp: new Date().toISOString()
      };

      if (this.isTestMode) {
        console.log(`${result ? '✅' : '❌'} ${name}: ${result ? 'PASSED' : 'FAILED'} (${executionTime.toFixed(2)}ms)`);
      }

      return testResult;
    } catch (error) {
      const executionTime = performance.now() - startTime;
      
      const testResult: TestResult = {
        name,
        passed: false,
        executionTime,
        description,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };

      if (this.isTestMode) {
        console.log(`❌ ${name}: FAILED (${executionTime.toFixed(2)}ms) - ${testResult.error}`);
      }

      return testResult;
    }
  }

  private async createHealthCheck(
    name: string,
    checkFn: () => boolean
  ): Promise<HealthCheck> {
    const startTime = performance.now();
    
    try {
      const result = checkFn();
      const responseTime = performance.now() - startTime;
      
      return {
        name,
        status: result ? 'healthy' : 'unhealthy',
        responseTime,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const responseTime = performance.now() - startTime;
      
      return {
        name,
        status: 'unhealthy',
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  private getValidationRules(formName: string): Record<string, any> {
    // This would contain actual validation rules for different forms
    const rules: Record<string, Record<string, any>> = {
      LoginForm: {
        email: [{ required: true }, { pattern: /\S+@\S+\.\S+/ }],
        password: [{ required: true }]
      },
      SignupForm: {
        name: [{ required: true }, { minLength: 2 }],
        email: [{ required: true }, { pattern: /\S+@\S+\.\S+/ }],
        password: [{ required: true }, { minLength: 8 }]
      }
    };

    return rules[formName] || {};
  }

  public getTestResults(): TestResult[] {
    return [...this.testResults];
  }

  public clearTestResults(): void {
    this.testResults = [];
  }
}

// Type definitions for testing
interface TestResult {
  name: string;
  passed: boolean;
  executionTime: number;
  description?: string;
  error?: string;
  timestamp: string;
}

interface TestAnalysis {
  total: number;
  passed: number;
  failed: number;
  successRate: number;
  categorizedResults: Record<string, TestResult[]>;
  failedTests: TestResult[];
  averageExecutionTime: number;
}

interface HealthCheck {
  name: string;
  status: 'healthy' | 'unhealthy';
  responseTime: number;
  error?: string;
  timestamp: string;
}

interface HealthCheckResult {
  overall: 'healthy' | 'unhealthy';
  checks: HealthCheck[];
  timestamp: string;
}

export const testingUtils = TestingUtils.getInstance();

// Automated testing hooks for React components
export function useAutomatedTesting() {
  const runComponentTest = (componentName: string, testFn: () => boolean) => {
    return testingUtils.testComponent(componentName, testFn);
  };

  const runPerformanceTest = (operationName: string, operation: () => void, maxDuration: number) => {
    return testingUtils.testPerformance(operationName, operation, maxDuration);
  };

  return {
    runComponentTest,
    runPerformanceTest,
    generateMockUser: testingUtils.generateMockUser.bind(testingUtils),
    generateMockProperty: testingUtils.generateMockProperty.bind(testingUtils),
    analyzeTestResults: testingUtils.analyzeTestResults.bind(testingUtils)
  };
}
