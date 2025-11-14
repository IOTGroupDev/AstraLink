/**
 * Repository interfaces for data access abstraction
 * Implements Repository Pattern to separate business logic from data access
 */

/**
 * User profile data structure
 */
export interface UserProfile {
  id: string;
  email?: string | null;
  name?: string | null;
  birth_date?: string | null;
  birth_time?: string | null;
  birth_place?: string | null;
  gender?: string | null;
  city?: string | null;
  interests?: string | string[] | null;
  bio?: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * User creation data
 */
export interface CreateUserDto {
  id: string;
  email?: string;
  name?: string;
  birth_date?: string;
  birth_time?: string;
  birth_place?: string;
  gender?: string;
  city?: string;
}

/**
 * User update data
 */
export interface UpdateUserDto {
  name?: string;
  birth_date?: string;
  birth_time?: string;
  birth_place?: string;
  gender?: string;
  city?: string;
  interests?: string | string[];
  bio?: string;
}

/**
 * User Repository Interface
 * Абстракция для работы с пользовательскими данными
 */
export interface IUserRepository {
  /**
   * Find user by ID with fallback strategy
   * Tries: Admin Client → Regular Client → Prisma
   * @returns UserProfile or null if not found
   */
  findById(userId: string): Promise<UserProfile | null>;

  /**
   * Find user by ID using admin privileges only
   * @returns UserProfile or null
   */
  findByIdAdmin(userId: string): Promise<UserProfile | null>;

  /**
   * Create new user profile
   * @returns Created user profile
   */
  create(data: CreateUserDto): Promise<UserProfile>;

  /**
   * Update user profile
   * @returns Updated user profile
   */
  update(userId: string, data: UpdateUserDto): Promise<UserProfile>;

  /**
   * Delete user profile
   */
  delete(userId: string): Promise<void>;

  /**
   * Check if user exists
   */
  exists(userId: string): Promise<boolean>;
}

/**
 * Chart data structure
 */
export interface NatalChart {
  id: string;
  user_id: string;
  data: any; // Chart data JSON
  created_at?: string;
  updated_at?: string;
}

/**
 * Chart creation data
 */
export interface CreateChartDto {
  user_id: string;
  data: any;
}

/**
 * Chart Repository Interface
 * Абстракция для работы с натальными картами
 */
export interface IChartRepository {
  /**
   * Find chart by user ID with fallback strategy
   * Tries: Admin Client → Regular Client → Prisma
   * @returns NatalChart or null if not found
   */
  findByUserId(userId: string): Promise<NatalChart | null>;

  /**
   * Find all charts for user (in case of multiple versions)
   * @returns Array of charts
   */
  findAllByUserId(userId: string): Promise<NatalChart[]>;

  /**
   * Create new natal chart
   * @returns Created chart
   */
  create(data: CreateChartDto): Promise<NatalChart>;

  /**
   * Update existing chart
   * @returns Updated chart
   */
  update(chartId: string, data: any): Promise<NatalChart>;

  /**
   * Delete chart
   */
  delete(chartId: string): Promise<void>;

  /**
   * Delete all charts for user
   */
  deleteByUserId(userId: string): Promise<void>;

  /**
   * Check if user has a chart
   */
  hasChart(userId: string): Promise<boolean>;
}

/**
 * Repository error types
 */
export class RepositoryError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'RepositoryError';
  }
}

export class NotFoundError extends RepositoryError {
  constructor(resource: string, id: string) {
    super(`${resource} with id ${id} not found`);
    this.name = 'NotFoundError';
  }
}

export class DataAccessError extends RepositoryError {
  constructor(message: string, cause?: unknown) {
    super(`Data access error: ${message}`, cause);
    this.name = 'DataAccessError';
  }
}
