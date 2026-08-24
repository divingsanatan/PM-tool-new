export type WbsHierarchyType = 'milestone' | 'epic' | 'feature' | 'story' | 'task' | 'subtask' | 'status';

export interface DraggedWbsItem {
  type: 'task' | 'feature' | 'epic' | 'subtask';
  id: string;
  parentId?: string;
}

export interface DropValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Validates whether a dragged WBS hierarchy item can be dropped onto a target item/container.
 * 
 * Hierarchy Rules:
 * - Tasks (Work items/bugs) can only be dropped into Features or Stories, not directly into Milestones or Epics.
 * - Subtasks can only be dropped into Tasks (or Features to promote them to full tasks).
 * - Features can be dropped into Milestones or Epics.
 * - Epics can only be dropped into Milestones.
 * - Status columns can only receive Tasks.
 */
export function validateWbsDrop(
  draggedItem: DraggedWbsItem | null,
  targetType: WbsHierarchyType,
  targetId: string
): DropValidationResult {
  if (!draggedItem) {
    return { valid: false, reason: 'No item is currently being dragged' };
  }

  // An item cannot be dropped onto itself
  if (draggedItem.id === targetId) {
    return { valid: false, reason: 'Cannot drop an item onto itself' };
  }

  const { type: draggedType, parentId } = draggedItem;

  // 1. Dragging a TASK (Work Item / Task / Bug)
  if (draggedType === 'task') {
    if (targetType === 'milestone') {
      return {
        valid: false,
        reason: 'Tasks must belong to a Feature or Story, not directly to a Milestone'
      };
    }
    if (targetType === 'epic') {
      return {
        valid: false,
        reason: 'Tasks must belong to a Feature or Story, not directly to an Epic'
      };
    }
    if (targetType === 'feature' || targetType === 'story') {
      return { valid: true };
    }
    if (targetType === 'task') {
      return { valid: true }; // Sibling alignment / re-parenting to target's feature
    }
    if (targetType === 'status') {
      return { valid: true };
    }
    return { valid: false, reason: 'Invalid drop target for Task' };
  }

  // 2. Dragging a SUBTASK
  if (draggedType === 'subtask') {
    if (targetType === 'task') {
      if (parentId === targetId) {
        return { valid: false, reason: 'Subtask is already inside this Task' };
      }
      return { valid: true };
    }
    if (targetType === 'feature' || targetType === 'story') {
      return { valid: true }; // Promotes subtask to full Task under this Feature/Story
    }
    if (targetType === 'milestone') {
      return {
        valid: false,
        reason: 'Subtasks must belong to a Task (or be dropped into a Feature to promote)'
      };
    }
    if (targetType === 'epic') {
      return {
        valid: false,
        reason: 'Subtasks cannot be dropped directly into an Epic'
      };
    }
    if (targetType === 'status') {
      return {
        valid: false,
        reason: 'Subtasks cannot be dropped directly into status columns'
      };
    }
    return { valid: false, reason: 'Invalid drop target for Subtask' };
  }

  // 3. Dragging a FEATURE
  if (draggedType === 'feature') {
    if (targetType === 'milestone') {
      return { valid: true };
    }
    if (targetType === 'epic') {
      return { valid: true };
    }
    if (targetType === 'feature') {
      return { valid: false, reason: 'Cannot nest a Feature inside another Feature' };
    }
    if (targetType === 'task') {
      return { valid: false, reason: 'Cannot drop a Feature into a Task' };
    }
    if (targetType === 'status') {
      return { valid: false, reason: 'Features cannot be moved across status columns' };
    }
    return { valid: false, reason: 'Invalid drop target for Feature' };
  }

  // 4. Dragging an EPIC
  if (draggedType === 'epic') {
    if (targetType === 'milestone') {
      return { valid: true };
    }
    if (targetType === 'epic') {
      return { valid: false, reason: 'Cannot nest an Epic inside another Epic' };
    }
    if (targetType === 'feature') {
      return { valid: false, reason: 'Cannot drop an Epic into a Feature' };
    }
    if (targetType === 'task') {
      return { valid: false, reason: 'Cannot drop an Epic into a Task' };
    }
    if (targetType === 'status') {
      return { valid: false, reason: 'Epics cannot be moved across status columns' };
    }
    return { valid: false, reason: 'Invalid drop target for Epic' };
  }

  return { valid: false, reason: 'Invalid hierarchy drop' };
}
