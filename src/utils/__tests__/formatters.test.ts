import { formatMobileNumber, formatCurrency, capitalizeWords } from '../formatters';

describe('Formatters', () => {
  describe('formatMobileNumber', () => {
    test('should format 10-digit number to +91 format', () => {
      expect(formatMobileNumber('9876543210')).toBe('+919876543210');
    });

    test('should handle number with country code', () => {
      expect(formatMobileNumber('919876543210')).toBe('+919876543210');
    });

    test('should handle number with +91 prefix', () => {
      expect(formatMobileNumber('+919876543210')).toBe('+919876543210');
    });

    test('should handle number with leading zero', () => {
      expect(formatMobileNumber('09876543210')).toBe('+919876543210');
    });
  });

  describe('formatCurrency', () => {
    test('should format currency in Indian format', () => {
      const result = formatCurrency(50000);
      expect(result).toContain('50,000');
      expect(result).toContain('₹');
    });
  });

  describe('capitalizeWords', () => {
    test('should capitalize first letter of each word', () => {
      expect(capitalizeWords('hello world')).toBe('Hello World');
      expect(capitalizeWords('HELLO WORLD')).toBe('Hello World');
      expect(capitalizeWords('hello')).toBe('Hello');
    });
  });
});