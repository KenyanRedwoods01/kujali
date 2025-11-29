/**
 * ADD NOTE TO BUDGET COMMAND
 * 
 * CQRS Command Pattern - Budget Notes Domain
 * 
 * PURPOSE:
 * Encapsulates the intent to add a text note to an existing budget.
 * Follows Command pattern with immutability and built-in validation.
 * 
 * ARCHITECTURE:
 * - Immutable command object (readonly properties)
 * - Fail-fast validation on construction
 * - No business logic (pure data structure)
 * - Serialization-ready for Firestore
 * 
 * USAGE:
 * ```typescript
 * const command = new AddNoteToBudgetCommand(
 *   'budget_2024_q4',
 *   'Updated projections based on Q3 actuals',
 *   'user_john_doe'
 * );
 * await handler.execute(command);
 * ```
 * 
 * @author iTalanta HPAP Candidate
 * @date November 29, 2025
 */

/**
 * Command to add a note to a budget
 * 
 * PROPERTIES:
 * - budgetId: Target budget identifier
 * - noteContent: Note text (1-5000 characters)
 * - authorId: User creating the note
 * - createdAt: Note creation timestamp
 * 
 * VALIDATION:
 * - All required fields must be non-empty
 * - Note content limited to 5000 characters
 * - Timestamps must be valid Date objects
 */
export class AddNoteToBudgetCommand {
  /**
   * Creates immutable command with validation
   * 
   * @param budgetId - Budget to add note to
   * @param noteContent - Note text content
   * @param authorId - User creating the note
   * @param createdAt - Creation timestamp (defaults to now)
   * 
   * @throws {Error} If validation fails
   */
  constructor(
    public readonly budgetId: string,
    public readonly noteContent: string,
    public readonly authorId: string,
    public readonly createdAt: Date = new Date()
  ) {
    // Fail-fast validation
    this.validate();
  }

  /**
   * Validates command data
   * 
   * RULES:
   * 1. Budget ID required and non-empty
   * 2. Note content required, 1-5000 characters
   * 3. Author ID required and non-empty
   * 4. Created date must be valid
   * 
   * @throws {Error} With detailed validation messages
   */
  private validate(): void {
    const errors: string[] = [];

    // Budget ID validation
    if (!this.budgetId || this.budgetId.trim() === '') {
      errors.push('Budget ID is required');
    }

    // Note content validation
    if (!this.noteContent || this.noteContent.trim() === '') {
      errors.push('Note content is required');
    } else if (this.noteContent.length > 5000) {
      errors.push(`Note content exceeds maximum length (5000 chars, got ${this.noteContent.length})`);
    }

    // Author ID validation
    if (!this.authorId || this.authorId.trim() === '') {
      errors.push('Author ID is required');
    }

    // Timestamp validation
    if (!this.createdAt || !(this.createdAt instanceof Date)) {
      errors.push('Created date must be a valid Date object');
    } else if (isNaN(this.createdAt.getTime())) {
      errors.push('Created date is invalid');
    }

    // Throw if any validation errors
    if (errors.length > 0) {
      throw new Error(`Command validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Converts command to plain object for persistence
   * 
   * @returns Plain object suitable for Firestore
   */
  toObject(): Record<string, any> {
    return {
      budgetId: this.budgetId,
      noteContent: this.noteContent,
      authorId: this.authorId,
      createdAt: this.createdAt.toISOString()
    };
  }

  /**
   * Creates command from plain object
   * 
   * @param data - Stored command data
   * @returns Command instance
   */
  static fromObject(data: Record<string, any>): AddNoteToBudgetCommand {
    return new AddNoteToBudgetCommand(
      data.budgetId,
      data.noteContent,
      data.authorId,
      new Date(data.createdAt)
    );
  }
}