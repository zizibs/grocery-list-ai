// Regular expressions for validation
const NAME_REGEX = /^[a-zA-Z0-9\s\-_.,!?()&{}[\]^:;"']+$/;
const SHARE_CODE_REGEX = /^[A-Z0-9]{6}$/;
const GENERAL_TEXT_REGEX = /^[a-zA-Z0-9\s\-_.,!?()&{}[\]^:;"']+$/;
const HAS_LETTER_OR_NUMBER = /[a-zA-Z0-9]/;

// Maximum lengths
const MAX_NAME_LENGTH = 100;
const MAX_ITEM_NAME_LENGTH = 200;
const MAX_GENERAL_TEXT_LENGTH = 500;

export interface ValidationResult {
  isValid: boolean;
  sanitizedValue?: string;
  error: string | null;  // Make error always present but potentially null
}

export function validateAndSanitizeListName(name: string): ValidationResult {
  // Trim whitespace
  const trimmed = name.trim();
  
  // Check length
  if (trimmed.length === 0) {
    return { isValid: false, error: 'List name cannot be empty' };
  }
  if (trimmed.length > MAX_NAME_LENGTH) {
    return { isValid: false, error: `List name cannot be longer than ${MAX_NAME_LENGTH} characters` };
  }
  
  // Check for valid characters
  if (!NAME_REGEX.test(trimmed)) {
    return { 
      isValid: false, 
      error: 'List name can only contain letters, numbers, spaces, and basic punctuation (.,!?-_&(){}[]^:;"\')' 
    };
  }

  // Check if contains at least one letter or number
  if (!HAS_LETTER_OR_NUMBER.test(trimmed)) {
    return {
      isValid: false,
      error: 'List name must contain at least one letter or number'
    };
  }
  
  // Encode any HTML entities
  const sanitized = trimmed
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  
  return { isValid: true, sanitizedValue: sanitized, error: null };
}

export function validateAndSanitizeItemName(name: string): ValidationResult {
  // Trim whitespace
  const trimmed = name.trim();
  
  // Check length
  if (trimmed.length === 0) {
    return { isValid: false, error: 'Item name cannot be empty' };
  }
  if (trimmed.length > MAX_ITEM_NAME_LENGTH) {
    return { isValid: false, error: `Item name cannot be longer than ${MAX_ITEM_NAME_LENGTH} characters` };
  }
  
  // Check for valid characters
  if (!NAME_REGEX.test(trimmed)) {
    return { 
      isValid: false, 
      error: 'Item name can only contain letters, numbers, spaces, and basic punctuation (.,!?-_&(){}[]^:;"\')' 
    };
  }

  // Check if contains at least one letter or number
  if (!HAS_LETTER_OR_NUMBER.test(trimmed)) {
    return {
      isValid: false,
      error: 'Item name must contain at least one letter or number'
    };
  }
  
  // Encode any HTML entities
  const sanitized = trimmed
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  
  return { isValid: true, sanitizedValue: sanitized, error: null };
}

export function validateShareCode(code: string): ValidationResult {
  // Convert to uppercase and trim
  const processed = code.trim().toUpperCase();
  
  // Check format
  if (!SHARE_CODE_REGEX.test(processed)) {
    return { 
      isValid: false, 
      error: 'Share code must be 6 characters long and contain only uppercase letters and numbers' 
    };
  }
  
  return { isValid: true, sanitizedValue: processed, error: null };
}

export function validateGeneralText(text: string): ValidationResult {
  // Trim whitespace
  const trimmed = text.trim();
  
  // Check length
  if (trimmed.length === 0) {
    return { isValid: false, error: 'Text cannot be empty' };
  }
  if (trimmed.length > MAX_GENERAL_TEXT_LENGTH) {
    return { isValid: false, error: `Text cannot be longer than ${MAX_GENERAL_TEXT_LENGTH} characters` };
  }
  
  // Check for valid characters
  if (!GENERAL_TEXT_REGEX.test(trimmed)) {
    return { 
      isValid: false, 
      error: 'Text can only contain letters, numbers, spaces, and basic punctuation (.,!?-_&(){}[]^:;"\')' 
    };
  }

  // Check if contains at least one letter or number
  if (!HAS_LETTER_OR_NUMBER.test(trimmed)) {
    return {
      isValid: false,
      error: 'Text must contain at least one letter or number'
    };
  }
  
  // Encode any HTML entities
  const sanitized = trimmed
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  
  return { isValid: true, sanitizedValue: sanitized, error: null };
} 