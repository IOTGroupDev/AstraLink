import { Transform } from 'class-transformer';
import { sanitizeInput, SANITIZE_OPTIONS } from '../utils/sanitization.util';

/**
 * Decorator to sanitize string inputs in DTOs
 * Removes or escapes HTML to prevent XSS attacks
 *
 * @param options - Sanitization level: 'strict' (default), 'basic', or 'none'
 *
 * @example
 * class UpdateProfileDto {
 *   @Sanitize('strict')
 *   @IsString()
 *   name?: string;
 *
 *   @Sanitize('basic')  // Allows some formatting tags
 *   @IsString()
 *   bio?: string;
 * }
 */
export function Sanitize(
  options: keyof typeof SANITIZE_OPTIONS = 'strict',
) {
  return Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    return sanitizeInput(value, options);
  });
}
