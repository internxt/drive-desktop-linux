import { Result } from '../../../context/shared/domain/Result';
import { getRawUsageAndLimit } from './get-raw-usage-and-limit';

/**
 * Validates if there's enough drive space available to reserve the requested amount.
 */
export async function validateSpace(desiredSpaceToUse: number): Promise<Result<{ hasSpace: boolean }, Error>> {
  try {
    if (!Number.isFinite(desiredSpaceToUse) || desiredSpaceToUse < 0) {
      return { error: new Error('Desired space to use must be a finite non-negative number') };
    }

    const usageResult = await getRawUsageAndLimit();

    if (usageResult.error) {
      return usageResult;
    }

    const {
      data: { limitInBytes, driveUsage },
    } = usageResult;

    const availableSpace = limitInBytes - driveUsage;
    const hasSpace = desiredSpaceToUse <= availableSpace;

    return { data: { hasSpace } };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error('Failed to validate space'),
    };
  }
}
