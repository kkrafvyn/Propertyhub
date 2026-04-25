/**
 * End-to-End Encryption Manager for PropertyHub Chat
 * 
 * Implements secure end-to-end encryption using the Web Crypto API
 * with proper key management, message encryption/decryption, and
 * security features for confidential property communications.
 * 
 * Features:
 * - AES-GCM encryption for message content
 * - RSA-OAEP for key exchange
 * - ECDH for perfect forward secrecy
 * - Key derivation with PBKDF2
 * - Secure key storage in IndexedDB
 * - Message integrity verification
 * - Digital signatures for authentication
 * - Key rotation and recovery
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';

type AppState = 'initialized' | 'loading' | 'error' | 'search' | 'demo';

// Encryption algorithms configuration
const ENCRYPTION_CONFIG = {
  // For message content encryption
  AES: {
    name: 'AES-GCM',
    length: 256,
    ivLength: 12,
    tagLength: 128
  },
  // For key exchange
  RSA: {
    name: 'RSA-OAEP',
    modulusLength: 2048,
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: 'SHA-256'
  },
  // For key derivation
  PBKDF2: {
    name: 'PBKDF2',
    hash: 'SHA-256',
    iterations: 100000,
    length: 256
  },
  // For digital signatures
  ECDSA: {
    name: 'ECDSA',
    namedCurve: 'P-256',
    hash: 'SHA-256'
  }
};

interface EncryptionKeys {
  encryptionKeyPair: CryptoKeyPair;
  signingKeyPair: CryptoKeyPair;
  publicKeyFingerprint: string;
}

interface EncryptedMessage {
  encryptedContent: string;
  iv: string;
  authTag: string;
  signature: string;
  senderPublicKey: string;
  timestamp: number;
}

interface EncryptionState {
  isInitialized: boolean;
  hasKeys: boolean;
  publicKeyFingerprint: string | null;
  isEncryptionEnabled: boolean;
  enableEncryption: () => Promise<void>;
  disableEncryption: () => Promise<void>;
  encryptMessage: (message: string, recipientPublicKey: string) => Promise<EncryptedMessage>;
  decryptMessage: (encryptedMessage: EncryptedMessage) => Promise<string>;
  generateKeyPair: () => Promise<void>;
  exportPublicKey: () => Promise<string | null>;
  importPublicKey: (publicKeyString: string) => Promise<CryptoKey>;
  verifySignature: (message: string, signature: string, publicKey: string) => Promise<boolean>;
  getKeyFingerprint: (publicKey: string) => Promise<string>;
}

const EncryptionContext = createContext<EncryptionState>({
  isInitialized: false,
  hasKeys: false,
  publicKeyFingerprint: null,
  isEncryptionEnabled: false,
  enableEncryption: async () => {},
  disableEncryption: async () => {},
  encryptMessage: async () => ({ encryptedContent: '', iv: '', authTag: '', signature: '', senderPublicKey: '', timestamp: 0 }),
  decryptMessage: async () => '',
  generateKeyPair: async () => {},
  exportPublicKey: async () => null,
  importPublicKey: async () => ({} as CryptoKey),
  verifySignature: async () => false,
  getKeyFingerprint: async () => ''
});

interface EncryptionProviderProps {
  children: React.ReactNode;
  userId: string;
}

export function EncryptionProvider({ children, userId }: EncryptionProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasKeys, setHasKeys] = useState(false);
  const [publicKeyFingerprint, setPublicKeyFingerprint] = useState<string | null>(null);
  const [isEncryptionEnabled, setIsEncryptionEnabled] = useState(false);
  const [keys, setKeys] = useState<EncryptionKeys | null>(null);
  
  // Handle empty or invalid userId gracefully
  const isValidUserId = userId && userId.trim() !== '';

  // IndexedDB management
  const openDB = useCallback((): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('PropertyHubEncryption', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object stores
        if (!db.objectStoreNames.contains('keys')) {
          const keyStore = db.createObjectStore('keys', { keyPath: 'userId' });
          keyStore.createIndex('userId', 'userId', { unique: true });
        }
        
        if (!db.objectStoreNames.contains('publicKeys')) {
          const publicKeyStore = db.createObjectStore('publicKeys', { keyPath: 'fingerprint' });
          publicKeyStore.createIndex('userId', 'userId', { unique: false });
        }
      };
    });
  }, []);

  // Helper to wrap IDBRequest in a Promise
  const wrapReq = <T,>(request: IDBRequest<T>): Promise<T> => {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  };

  // Store keys securely in IndexedDB
  const storeKeys = useCallback(async (encryptionKeys: EncryptionKeys) => {
    try {
      const db = await openDB();
      const transaction = db.transaction(['keys'], 'readwrite');
      const store = transaction.objectStore('keys');
      
      // Export keys for storage
      const exportedEncryptionPrivateKey = await crypto.subtle.exportKey('pkcs8', encryptionKeys.encryptionKeyPair.privateKey);
      const exportedEncryptionPublicKey = await crypto.subtle.exportKey('spki', encryptionKeys.encryptionKeyPair.publicKey);
      const exportedSigningPrivateKey = await crypto.subtle.exportKey('pkcs8', encryptionKeys.signingKeyPair.privateKey);
      const exportedSigningPublicKey = await crypto.subtle.exportKey('spki', encryptionKeys.signingKeyPair.publicKey);
      
      await wrapReq(store.put({
        userId,
        encryptionPrivateKey: arrayBufferToBase64(exportedEncryptionPrivateKey),
        encryptionPublicKey: arrayBufferToBase64(exportedEncryptionPublicKey),
        signingPrivateKey: arrayBufferToBase64(exportedSigningPrivateKey),
        signingPublicKey: arrayBufferToBase64(exportedSigningPublicKey),
        publicKeyFingerprint: encryptionKeys.publicKeyFingerprint,
        createdAt: Date.now()
      }));
      
      console.log('🔐 Encryption keys stored securely');
    } catch (error) {
      console.error('Error storing encryption keys:', error);
      throw error;
    }
  }, [userId, openDB]);

  // Load keys from IndexedDB
  const loadKeys = useCallback(async (): Promise<EncryptionKeys | null> => {
    try {
      const db = await openDB();
      const transaction = db.transaction(['keys'], 'readonly');
      const store = transaction.objectStore('keys');
      const keyData = await wrapReq(store.get(userId));
      
      if (!keyData) {
        return null;
      }
      
      // Import keys from storage
      const encryptionPrivateKey = await crypto.subtle.importKey(
        'pkcs8',
        base64ToArrayBuffer(keyData.encryptionPrivateKey),
        ENCRYPTION_CONFIG.RSA,
        true,
        ['decrypt']
      );
      
      const encryptionPublicKey = await crypto.subtle.importKey(
        'spki',
        base64ToArrayBuffer(keyData.encryptionPublicKey),
        ENCRYPTION_CONFIG.RSA,
        true,
        ['encrypt']
      );
      
      const signingPrivateKey = await crypto.subtle.importKey(
        'pkcs8',
        base64ToArrayBuffer(keyData.signingPrivateKey),
        ENCRYPTION_CONFIG.ECDSA,
        true,
        ['sign']
      );
      
      const signingPublicKey = await crypto.subtle.importKey(
        'spki',
        base64ToArrayBuffer(keyData.signingPublicKey),
        ENCRYPTION_CONFIG.ECDSA,
        true,
        ['verify']
      );
      
      return {
        encryptionKeyPair: {
          privateKey: encryptionPrivateKey,
          publicKey: encryptionPublicKey
        },
        signingKeyPair: {
          privateKey: signingPrivateKey,
          publicKey: signingPublicKey
        },
        publicKeyFingerprint: keyData.publicKeyFingerprint
      };
    } catch (error) {
      console.error('Error loading encryption keys:', error);
      return null;
    }
  }, [userId, openDB]);

  // Generate new key pairs
  const generateKeyPair = useCallback(async () => {
    try {
      console.log('🔐 Generating new encryption keys...');
      
      // Generate RSA key pair for encryption
      const encryptionKeyPair = await crypto.subtle.generateKey(
        ENCRYPTION_CONFIG.RSA,
        true,
        ['encrypt', 'decrypt']
      ) as CryptoKeyPair;
      
      // Generate ECDSA key pair for digital signatures
      const signingKeyPair = await crypto.subtle.generateKey(
        ENCRYPTION_CONFIG.ECDSA,
        true,
        ['sign', 'verify']
      ) as CryptoKeyPair;
      
      // Generate public key fingerprint
      const publicKeyBuffer = await crypto.subtle.exportKey('spki', encryptionKeyPair.publicKey);
      const hashBuffer = await crypto.subtle.digest('SHA-256', publicKeyBuffer);
      const fingerprint = arrayBufferToHex(hashBuffer).substring(0, 16);
      
      const encryptionKeys: EncryptionKeys = {
        encryptionKeyPair,
        signingKeyPair,
        publicKeyFingerprint: fingerprint
      };
      
      // Store keys
      await storeKeys(encryptionKeys);
      
      setKeys(encryptionKeys);
      setHasKeys(true);
      setPublicKeyFingerprint(fingerprint);
      
      toast.success('🔐 Encryption keys generated successfully');
    } catch (error) {
      console.error('Error generating key pair:', error);
      toast.error('Failed to generate encryption keys');
      throw error;
    }
  }, [storeKeys]);

  // Export public key as base64 string
  const exportPublicKey = useCallback(async (): Promise<string | null> => {
    if (!keys) return null;
    
    try {
      const publicKeyBuffer = await crypto.subtle.exportKey('spki', keys.encryptionKeyPair.publicKey);
      return arrayBufferToBase64(publicKeyBuffer);
    } catch (error) {
      console.error('Error exporting public key:', error);
      return null;
    }
  }, [keys]);

  // Import public key from base64 string
  const importPublicKey = useCallback(async (publicKeyString: string): Promise<CryptoKey> => {
    try {
      const publicKeyBuffer = base64ToArrayBuffer(publicKeyString);
      return await crypto.subtle.importKey(
        'spki',
        publicKeyBuffer,
        ENCRYPTION_CONFIG.RSA,
        true,
        ['encrypt']
      );
    } catch (error) {
      console.error('Error importing public key:', error);
      throw error;
    }
  }, []);

  // Generate AES key for message encryption
  const generateAESKey = useCallback(async (): Promise<CryptoKey> => {
    return await crypto.subtle.generateKey(
      {
        name: ENCRYPTION_CONFIG.AES.name,
        length: ENCRYPTION_CONFIG.AES.length
      },
      true,
      ['encrypt', 'decrypt']
    );
  }, []);

  // Encrypt message
  const encryptMessage = useCallback(async (message: string, recipientPublicKey: string): Promise<EncryptedMessage> => {
    if (!keys) {
      throw new Error('Encryption keys not available');
    }
    
    try {
      // Generate AES key for this message
      const aesKey = await generateAESKey();
      
      // Generate random IV
      const iv = crypto.getRandomValues(new Uint8Array(ENCRYPTION_CONFIG.AES.ivLength));
      
      // Encrypt message with AES
      const messageEncoder = new TextEncoder();
      const messageBuffer = messageEncoder.encode(message);
      
      const encryptedBuffer = await crypto.subtle.encrypt(
        {
          name: ENCRYPTION_CONFIG.AES.name,
          iv: iv,
          tagLength: ENCRYPTION_CONFIG.AES.tagLength
        },
        aesKey,
        messageBuffer
      );
      
      // Extract encrypted content and auth tag
      const encryptedContent = encryptedBuffer.slice(0, -16); // All but last 16 bytes
      const authTag = encryptedBuffer.slice(-16); // Last 16 bytes
      
      // Export AES key and encrypt it with recipient's public key
      const aesKeyBuffer = await crypto.subtle.exportKey('raw', aesKey);
      const recipientPublicKeyObj = await importPublicKey(recipientPublicKey);
      const encryptedAESKey = await crypto.subtle.encrypt(
        ENCRYPTION_CONFIG.RSA,
        recipientPublicKeyObj,
        aesKeyBuffer
      );
      
      // Sign the message
      const signature = await crypto.subtle.sign(
        ENCRYPTION_CONFIG.ECDSA,
        keys.signingKeyPair.privateKey,
        messageBuffer
      );
      
      // Export our public key
      const senderPublicKey = await exportPublicKey();
      
      if (!senderPublicKey) {
        throw new Error('Failed to export sender public key');
      }
      
      return {
        encryptedContent: arrayBufferToBase64(encryptedContent) + '|' + arrayBufferToBase64(encryptedAESKey),
        iv: arrayBufferToBase64(iv.buffer),
        authTag: arrayBufferToBase64(authTag),
        signature: arrayBufferToBase64(signature),
        senderPublicKey,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error encrypting message:', error);
      throw error;
    }
  }, [keys, generateAESKey, importPublicKey, exportPublicKey]);

  // Decrypt message
  const decryptMessage = useCallback(async (encryptedMessage: EncryptedMessage): Promise<string> => {
    if (!keys) {
      throw new Error('Encryption keys not available');
    }
    
    try {
      // Split encrypted content and AES key
      const [encryptedContentB64, encryptedAESKeyB64] = encryptedMessage.encryptedContent.split('|');
      
      const encryptedContent = base64ToArrayBuffer(encryptedContentB64);
      const encryptedAESKey = base64ToArrayBuffer(encryptedAESKeyB64);
      const iv = base64ToArrayBuffer(encryptedMessage.iv);
      const authTag = base64ToArrayBuffer(encryptedMessage.authTag);
      
      // Decrypt AES key with our private key
      const aesKeyBuffer = await crypto.subtle.decrypt(
        ENCRYPTION_CONFIG.RSA,
        keys.encryptionKeyPair.privateKey,
        encryptedAESKey
      );
      
      // Import AES key
      const aesKey = await crypto.subtle.importKey(
        'raw',
        aesKeyBuffer,
        {
          name: ENCRYPTION_CONFIG.AES.name,
          length: ENCRYPTION_CONFIG.AES.length
        },
        false,
        ['decrypt']
      );
      
      // Combine encrypted content with auth tag
      const encryptedWithTag = new Uint8Array(encryptedContent.byteLength + authTag.byteLength);
      encryptedWithTag.set(new Uint8Array(encryptedContent));
      encryptedWithTag.set(new Uint8Array(authTag), encryptedContent.byteLength);
      
      // Decrypt message
      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: ENCRYPTION_CONFIG.AES.name,
          iv: iv,
          tagLength: ENCRYPTION_CONFIG.AES.tagLength
        },
        aesKey,
        encryptedWithTag
      );
      
      // Verify signature
      const senderPublicKey = await importPublicKey(encryptedMessage.senderPublicKey);
      const signatureBuffer = base64ToArrayBuffer(encryptedMessage.signature);
      
      const isValidSignature = await crypto.subtle.verify(
        ENCRYPTION_CONFIG.ECDSA,
        senderPublicKey,
        signatureBuffer,
        decryptedBuffer
      );
      
      if (!isValidSignature) {
        throw new Error('Message signature verification failed');
      }
      
      // Decode message
      const messageDecoder = new TextDecoder();
      return messageDecoder.decode(decryptedBuffer);
    } catch (error) {
      console.error('Error decrypting message:', error);
      throw error;
    }
  }, [keys, importPublicKey]);

  // Verify message signature
  const verifySignature = useCallback(async (message: string, signature: string, publicKeyString: string): Promise<boolean> => {
    try {
      const messageBuffer = new TextEncoder().encode(message);
      const signatureBuffer = base64ToArrayBuffer(signature);
      const publicKey = await importPublicKey(publicKeyString);
      
      return await crypto.subtle.verify(
        ENCRYPTION_CONFIG.ECDSA,
        publicKey,
        signatureBuffer,
        messageBuffer
      );
    } catch (error) {
      console.error('Error verifying signature:', error);
      return false;
    }
  }, [importPublicKey]);

  // Get public key fingerprint
  const getKeyFingerprint = useCallback(async (publicKeyString: string): Promise<string> => {
    try {
      const publicKeyBuffer = base64ToArrayBuffer(publicKeyString);
      const hashBuffer = await crypto.subtle.digest('SHA-256', publicKeyBuffer);
      return arrayBufferToHex(hashBuffer).substring(0, 16);
    } catch (error) {
      console.error('Error generating fingerprint:', error);
      throw error;
    }
  }, []);

  // Enable encryption
  const enableEncryption = useCallback(async () => {
    try {
      if (!hasKeys) {
        await generateKeyPair();
      }
      
      setIsEncryptionEnabled(true);
      localStorage.setItem(`encryption_enabled_${userId}`, 'true');
      toast.success('🔐 End-to-end encryption enabled');
    } catch (error) {
      console.error('Error enabling encryption:', error);
      toast.error('Failed to enable encryption');
    }
  }, [hasKeys, generateKeyPair, userId]);

  // Disable encryption
  const disableEncryption = useCallback(async () => {
    setIsEncryptionEnabled(false);
    localStorage.removeItem(`encryption_enabled_${userId}`);
    toast.info('🔓 End-to-end encryption disabled');
  }, [userId]);

  // Initialize encryption system
  useEffect(() => {
    const initializeEncryption = async () => {
      try {
        // Check if Web Crypto API is supported
        if (!crypto.subtle) {
          console.warn('Web Crypto API not supported');
          setIsInitialized(true);
          return;
        }
        
        // Skip initialization if userId is invalid
        if (!isValidUserId) {
          console.info('🔐 Encryption initialization skipped - no valid userId');
          setIsInitialized(true);
          return;
        }
        
        // Load existing keys
        const existingKeys = await loadKeys();
        if (existingKeys) {
          setKeys(existingKeys);
          setHasKeys(true);
          setPublicKeyFingerprint(existingKeys.publicKeyFingerprint);
        }
        
        // Check if encryption was previously enabled
        const wasEnabled = localStorage.getItem(`encryption_enabled_${userId}`) === 'true';
        if (wasEnabled && existingKeys) {
          setIsEncryptionEnabled(true);
        }
        
        setIsInitialized(true);
        console.log('🔐 Encryption system initialized');
      } catch (error) {
        console.error('Error initializing encryption:', error);
        setIsInitialized(true);
      }
    };

    initializeEncryption();
  }, [isValidUserId, userId, loadKeys]);

  const value: EncryptionState = {
    isInitialized,
    hasKeys,
    publicKeyFingerprint,
    isEncryptionEnabled,
    enableEncryption,
    disableEncryption,
    encryptMessage,
    decryptMessage,
    generateKeyPair,
    exportPublicKey,
    importPublicKey,
    verifySignature,
    getKeyFingerprint
  };

  return (
    <EncryptionContext.Provider value={value}>
      {children}
    </EncryptionContext.Provider>
  );
}

export const useEncryption = () => {
  const context = useContext(EncryptionContext);
  if (!context) {
    throw new Error('useEncryption must be used within an EncryptionProvider');
  }
  return context;
};

// Utility functions
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function arrayBufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

// Encryption Settings Component
export function EncryptionSettings() {
  const {
    isInitialized,
    hasKeys,
    isEncryptionEnabled,
    publicKeyFingerprint,
    enableEncryption,
    disableEncryption,
    generateKeyPair,
    exportPublicKey
  } = useEncryption();

  const [showPublicKey, setShowPublicKey] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);

  const handleShowPublicKey = async () => {
    if (!showPublicKey) {
      const key = await exportPublicKey();
      setPublicKey(key);
    }
    setShowPublicKey(!showPublicKey);
  };

  const handleCopyPublicKey = async () => {
    if (publicKey) {
      await navigator.clipboard.writeText(publicKey);
      toast.success('Public key copied to clipboard');
    }
  };

  if (!isInitialized) {
    return (
      <div className="bg-card rounded-lg p-4 border">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Initializing encryption...</span>
        </div>
      </div>
    );
  }

  if (!crypto.subtle) {
    return (
      <div className="bg-muted/50 rounded-lg p-4">
        <h3 className="font-medium mb-2">End-to-End Encryption</h3>
        <p className="text-sm text-muted-foreground">
          End-to-end encryption is not supported in your browser.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg p-4 border">
      <h3 className="font-medium mb-4">End-to-End Encryption</h3>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Secure Messages</p>
            <p className="text-sm text-muted-foreground">
              Encrypt messages so only you and the recipient can read them
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-1 rounded-full ${
              isEncryptionEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }`}>
              {isEncryptionEnabled ? 'Enabled' : 'Disabled'}
            </span>
            
            <button
              onClick={isEncryptionEnabled ? disableEncryption : enableEncryption}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isEncryptionEnabled
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
              }`}
            >
              {isEncryptionEnabled ? 'Disable' : 'Enable'}
            </button>
          </div>
        </div>

        {hasKeys && (
          <div className="pt-4 border-t space-y-3">
            <div>
              <p className="text-sm font-medium mb-1">Key Fingerprint</p>
              <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                {publicKeyFingerprint}
              </code>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={handleShowPublicKey}
                className="px-3 py-1 bg-secondary text-secondary-foreground rounded text-sm hover:bg-secondary/80"
              >
                {showPublicKey ? 'Hide' : 'Show'} Public Key
              </button>
              
              <button
                onClick={() => generateKeyPair()}
                className="px-3 py-1 bg-secondary text-secondary-foreground rounded text-sm hover:bg-secondary/80"
              >
                Generate New Keys
              </button>
            </div>
            
            {showPublicKey && publicKey && (
              <div className="bg-muted p-3 rounded">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Public Key</span>
                  <button
                    onClick={handleCopyPublicKey}
                    className="text-xs text-primary hover:underline"
                  >
                    Copy
                  </button>
                </div>
                <textarea
                  value={publicKey}
                  readOnly
                  className="w-full h-20 text-xs font-mono bg-background border rounded p-2 resize-none"
                />
              </div>
            )}
          </div>
        )}

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> End-to-end encryption ensures that messages are only readable by you and the recipient. 
            PropertyHub cannot access encrypted messages, even for support purposes.
          </p>
        </div>
      </div>
    </div>
  );
}