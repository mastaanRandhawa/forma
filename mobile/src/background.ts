import * as BackgroundFetch from "expo-background-fetch";
import * as TaskManager from "expo-task-manager";
import { isAuthed } from "./api";
import { runSync } from "./health";

/**
 * Periodic background health sync (§3.2). The OS decides the actual cadence
 * (typically every few hours on iOS, ~15 min minimum on Android). All errors are
 * swallowed — a failed background run just retries next interval.
 */
export const SYNC_TASK = "forma-health-sync";

TaskManager.defineTask(SYNC_TASK, async () => {
  try {
    if (!(await isAuthed())) return BackgroundFetch.BackgroundFetchResult.NoData;
    const { ingested } = await runSync();
    return ingested > 0
      ? BackgroundFetch.BackgroundFetchResult.NewData
      : BackgroundFetch.BackgroundFetchResult.NoData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerBackgroundSync() {
  const status = await BackgroundFetch.getStatusAsync();
  if (status === BackgroundFetch.BackgroundFetchStatus.Restricted || status === BackgroundFetch.BackgroundFetchStatus.Denied)
    return false;
  await BackgroundFetch.registerTaskAsync(SYNC_TASK, {
    minimumInterval: 60 * 60 * 3, // 3h; OS may run less often
    stopOnTerminate: false,
    startOnBoot: true,
  });
  return true;
}

export async function unregisterBackgroundSync() {
  if (await TaskManager.isTaskRegisteredAsync(SYNC_TASK)) await BackgroundFetch.unregisterTaskAsync(SYNC_TASK);
}

export async function isBackgroundSyncRegistered() {
  return TaskManager.isTaskRegisteredAsync(SYNC_TASK);
}
