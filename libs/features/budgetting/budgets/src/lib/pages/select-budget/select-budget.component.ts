/**
 * SelectBudgetPageComponent
 * 
 * PURPOSE: Modernized budget selection page using Angular Signals
 * ARCHITECTURE: Replaces RxJS Observable patterns with fine-grained reactivity
 * 
 * KEY BENEFITS:
 * - Automatic memory management (no subscriptions)
 * - Improved performance through fine-grained reactivity
 * - Cleaner, more declarative code
 * 
 * @author iTalanta HPAP Candidate
 * @date November 29, 2025
 */
import { Component, computed, effect, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { toSignal } from '@angular/core/rxjs-interop';

import { cloneDeep as ___cloneDeep, flatMap as __flatMap } from 'lodash';

import { Logger } from '@iote/bricks-angular';

import { Budget, BudgetRecord, BudgetStatus, OrgBudgetsOverview } from '@app/model/finance/planning/budgets';

import { BudgetsStore, OrgBudgetsStore } from '@app/state/finance/budgetting/budgets';

import { CreateBudgetModalComponent } from '../../components/create-budget-modal/create-budget-modal.component';

/**
 * Standalone component for better tree-shaking
 * 
 * SIGNALS ARCHITECTURE:
 * - overview: Signal-based organization budget overview
 * - sharedBudgets: Signal-based budget collection
 * - allBudgets: Computed signal for processed budget data
 * - showFilter: Signal for UI filter state
 */
@Component({
  selector: 'app-select-budget',
  standalone: true,
  templateUrl: './select-budget.component.html',
  styleUrls: ['./select-budget.component.scss', 
              '../../components/budget-view-styles.scss'],
  imports: [MatDialog]
})
export class SelectBudgetPageComponent
{
  // Modern dependency injection
  private readonly _orgBudgets$$ = inject(OrgBudgetsStore);
  private readonly _budgets$$ = inject(BudgetsStore);
  private readonly _dialog = inject(MatDialog);
  private readonly _logger = inject(Logger);

  // Signals for reactive state
  readonly overview = toSignal(
    this._orgBudgets$$.get(), 
    { initialValue: null }
  );

  readonly sharedBudgets = toSignal(
    this._budgets$$.get(), 
    { initialValue: [] }
  );

  readonly showFilter = signal(false);

  /**
   * Computed signal for processed budget data
   * Automatically recalculates when dependencies change
   */
  readonly allBudgets = computed(() => {
    const overview = this.overview();
    const sharedBudgets = this.sharedBudgets();

    // Early return for null/undefined data
    if (!overview || !sharedBudgets) {
      return { overview: [], budgets: [] };
    }

    try {
      // Flatten the data using existing logic
      const flatOverview = __flatMap(overview);
      const flatBudgets = __flatMap(sharedBudgets);

      // Calculate endYear for each budget (existing business logic)
      const processedBudgets = flatBudgets.map((budget: any) => ({
        ...budget,
        endYear: budget.startYear + budget.duration - 1
      }));

      return {
        overview: flatOverview,
        budgets: processedBudgets
      };
    } catch (error) {
      // Log errors only - no excessive logging for normal operations
      this._logger.error(() => `[SelectBudgetPage] Error processing budgets: ${error}`);
      return { overview: [], budgets: [] };
    }
  });

  /**
   * Computed signal for budget count
   */
  readonly budgetCount = computed(() => this.allBudgets().budgets.length);

  /**
   * Effect for side effects when budgets change
   */
  constructor() {
    effect(() => {
      const budgets = this.allBudgets().budgets;
      
      // Log only for significant events, not every action
      if (budgets.length > 0) {
        this._logger.log(() => 
          `[SelectBudgetPage] Loaded ${budgets.length} budgets`
        );
      }
    });
  }

  // ===== UI EVENT HANDLERS =====

  /**
   * Apply filter to budget data
   */
  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    // Removed excessive logging for normal user actions
    
    // Future enhancement: Implement signal-based filtering
    // this.filterText.set(filterValue);
  }

  /**
   * Toggle filter visibility
   */
  toggleFilter(value: boolean): void {
    this.showFilter.set(value);
  }

  /**
   * Open budget creation/editing dialog
   */
  openDialog(parent: Budget | false): void {
    const dialog = this._dialog.open(CreateBudgetModalComponent, {
      height: 'fit-content',
      width: '600px',
      data: parent !== false ? parent : false
    });

    dialog.afterClosed().subscribe(() => {
      // Keep minimal logging for user feedback
      this._logger.log(() => '[SelectBudgetPage] Budget dialog completed');
    });
  }

  /**
   * Check if budget can be promoted to active status
   * Simplified - no unnecessary try-catch
   */
  canPromote(record: BudgetRecord): boolean {
    return !!(record.budget as any)?.canBeActivated;
  }

  /**
   * Set budget as active (promote functionality)
   */
  setActive(record: BudgetRecord): void {
    // Create clean copy for update
    const toSave = ___cloneDeep(record.budget) as Budget;

    // Remove UI-specific fields
    delete (toSave as any).canBeActivated;
    delete (toSave as any).access;

    // Set active status
    toSave.status = BudgetStatus.InUse;

    // Set updating state for UI feedback
    (record as any).updating = true;

    // Update through store
    this._budgets$$.update(toSave).subscribe({
      next: () => {
        (record as any).updating = false;
        this._logger.log(() => 
          `Updated Budget with id ${toSave.id}. Set as active budget.`
        );
      },
      error: (error) => {
        (record as any).updating = false;
        this._logger.error(() => 
          `[SelectBudgetPage] Error activating budget ${toSave.id}: ${error}`
        );
      }
    });
  }
}