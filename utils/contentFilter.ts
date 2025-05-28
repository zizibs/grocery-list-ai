// List of blocked words (you can expand this list)
const BLOCKED_WORDS = [
  'terror',
  'terrorist',
  'bomb',
  'kill',
  'murder',
  'hate',
  'abuse',
  'drugs',
  'weapon',
  'attack',
  // Add more words as needed
];

/**
 * Checks if a message contains any blocked words
 * @param message The message to check
 * @returns {boolean} True if the message contains blocked words, false otherwise
 */
export const containsBlockedWords = (message: string): boolean => {
  const normalizedMessage = message.toLowerCase().trim();
  return BLOCKED_WORDS.some(word => normalizedMessage.includes(word.toLowerCase()));
};

/**
 * Filters a message and replaces blocked words with asterisks
 * @param message The message to filter
 * @returns {string} The filtered message
 */
export const filterMessage = (message: string): string => {
  let filteredMessage = message;
  BLOCKED_WORDS.forEach(word => {
    const regex = new RegExp(word, 'gi');
    filteredMessage = filteredMessage.replace(regex, '*'.repeat(word.length));
  });
  return filteredMessage;
};

/**
 * Validates a message and returns an error if it contains blocked words
 * @param message The message to validate
 * @returns {string | null} Error message if blocked words are found, null otherwise
 */
export const validateMessage = (message: string): string | null => {
  if (containsBlockedWords(message)) {
    return 'Your message contains inappropriate content. Please revise and try again.';
  }
  return null;
}; 