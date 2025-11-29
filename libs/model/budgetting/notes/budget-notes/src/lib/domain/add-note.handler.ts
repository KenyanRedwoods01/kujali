/**
 * ADD NOTE TO BUDGET HANDLER
 * 
 * CQRS Handler - Budget Notes Domain
 * 
 * PURPOSE:
 * Processes AddNoteToBudgetCommand by persisting note to Firestore
 * and updating budget metadata.
 * 
 * ARCHITECTURE:
 * - Extends FunctionHandler from @iote/cqrs (matches existing patterns)
 * - Uses HandlerTools for repository access
 * - Returns structured result (never throws)
 * - Comprehensive error handling and logging
 * 
 * PATTERN REFERENCE:
 * Based on libs/functions/finance/budgeting/src/lib/budgets/calculate-budget-header.handler.ts
 * 
 * @author iTalanta HPAP Candidate
 * @date November 29, 2025
 */

import { HandlerTools } from '@iote/cqrs';
import { FunctionHandler, FunctionContext } from '@ngfi/functions';
import { AddNoteToBudgetCommand } from './add-note.command';

/**
 * Budget interface (minimal subset needed)
 */
interface Budget {
  id: string;
  orgId: string;
  name: string;
  [key: string]: any;
}

/**
 * Budget note data model for Firestore
 * 
 * Storage path: /orgs/{orgId}/budgets/{budgetId}/notes/{noteId}
 */
interface BudgetNote {
  id: string;
  budgetId: string;
  orgId: string;
  content: string;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Handler execution result
 * 
 * Structured response pattern (no exceptions thrown)
 */
export interface AddNoteToBudgetResult {
  success: boolean;
  noteId?: string;
  budgetId: string;
  timestamp: Date;
  error?: string;
}

/**
 * Handler for AddNoteToBudgetCommand
 * 
 * EXECUTION FLOW:
 * 1. Validate command
 * 2. Verify budget exists
 * 3. Create note in Firestore
 * 4. Return structured result
 * 
 * ERROR HANDLING:
 * - Returns error result (never throws)
 * - Logs all errors for debugging
 * - Provides detailed error messages
 */
export class AddNoteToBudgetHandler extends FunctionHandler<
  AddNoteToBudgetCommand,
  AddNoteToBudgetResult
> {
  /**
   * Repository path for budgets
   * Pattern matches existing handlers
   */
  private BUDGETS_REPO_PATH = (orgId: string) => `orgs/${orgId}/budgets`;

  /**
   * Repository path for budget notes
   * Notes stored as subcollection of budgets
   */
  private NOTES_REPO_PATH = (orgId: string, budgetId: string) => 
    `orgs/${orgId}/budgets/${budgetId}/notes`;

  /**
   * Execute the command
   * 
   * @param command - Command to process
   * @param context - Function execution context
   * @param tools - Handler tools (repository, logging)
   * @returns Operation result
   */
  public async execute(
    command: AddNoteToBudgetCommand,
    context: FunctionContext,
    tools: HandlerTools
  ): Promise<AddNoteToBudgetResult> {
    const startTime = Date.now();

    try {
      // Log execution start
      tools.logger.log(() => 
        `[AddNoteToBudgetHandler] Adding note to budget ${command.budgetId}`
      );

      // Extract organization ID from budget ID
      const orgId = this.extractOrgId(command.budgetId);
      
      if (!orgId) {
        return this.errorResult(
          command.budgetId,
          'Invalid budget ID format'
        );
      }

      // Get budget repository
      const budgetsRepo = tools.getRepository<Budget>(
        this.BUDGETS_REPO_PATH(orgId)
      );

      // Verify budget exists
      const budget = await budgetsRepo.getDocById(command.budgetId);
      
      if (!budget || !budget.id) {
        tools.logger.error(() => 
          `[AddNoteToBudgetHandler] Budget not found: ${command.budgetId}`
        );
        
        return this.errorResult(
          command.budgetId,
          `Budget not found: ${command.budgetId}`
        );
      }

      // Generate note ID
      const noteId = this.generateNoteId();

      // Create note object
      const note: BudgetNote = {
        id: noteId,
        budgetId: command.budgetId,
        orgId: orgId,
        content: command.noteContent,
        authorId: command.authorId,
        createdAt: command.createdAt,
        updatedAt: new Date()
      };

      // Get notes repository
      const notesRepo = tools.getRepository<BudgetNote>(
        this.NOTES_REPO_PATH(orgId, command.budgetId)
      );

      // Persist note to Firestore
      await notesRepo.create(note, noteId);

      // Calculate execution time
      const executionTime = Date.now() - startTime;

      // Log success
      tools.logger.log(() => 
        `[AddNoteToBudgetHandler] Note ${noteId} added successfully in ${executionTime}ms`
      );

      // Return success result
      return {
        success: true,
        noteId: noteId,
        budgetId: command.budgetId,
        timestamp: new Date()
      };

    } catch (error) {
      // Log error
      const executionTime = Date.now() - startTime;
      
      tools.logger.error(() => 
        `[AddNoteToBudgetHandler] Execution failed after ${executionTime}ms: ${error.message}`
      );

      // Return error result
      return this.errorResult(
        command.budgetId,
        `Handler execution failed: ${error.message}`
      );
    }
  }

  /**
   * Extract organization ID from budget ID
   * 
   * Supports format: org_xxx_budget_yyy
   * Fallback: Use first two segments
   * 
   * @param budgetId - Budget identifier
   * @returns Organization ID or null
   */
  private extractOrgId(budgetId: string): string | null {
    try {
      // Try standard format: org_xxx_budget_yyy
      const match = budgetId.match(/^(org_[^_]+)_budget_/);
      if (match) {
        return match[1];
      }

      // Fallback: Use first two segments
      const parts = budgetId.split('_');
      if (parts.length >= 2) {
        return `${parts[0]}_${parts[1]}`;
      }

      return budgetId; // Last resort
    } catch (error) {
      return null;
    }
  }

  /**
   * Generate unique note ID
   * 
   * Format: note_{timestamp}_{random}
   * 
   * @returns Unique identifier
   */
  private generateNoteId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `note_${timestamp}_${random}`;
  }

  /**
   * Create error result object
   * 
   * @param budgetId - Budget ID
   * @param error - Error message
   * @returns Error result
   */
  private errorResult(budgetId: string, error: string): AddNoteToBudgetResult {
    return {
      success: false,
      budgetId: budgetId,
      timestamp: new Date(),
      error: error
    };
  }
}

/**
 * Factory function for Cloud Functions deployment
 */
export function createAddNoteToBudgetHandler(): AddNoteToBudgetHandler {
  return new AddNoteToBudgetHandler();
}// AddNoteToBudgetHandler implementation
