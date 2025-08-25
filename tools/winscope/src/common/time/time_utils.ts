/*
 * Copyright (C) 2024 The Android Open Source Project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Pauses execution for a specified amount of time.
 * @param ms The number of milliseconds to sleep.
 */
export async function sleepMs(ms: number) {
  await new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/**
 * Waits for a condition to be met.
 * @param condition The condition to wait for.
 * @param timeoutMs The maximum amount of time to wait in milliseconds.
 * @param intervalMs The amount of time to wait between checks in milliseconds.
 */
export async function wait(
  condition: () => boolean,
  timeoutMs = 5000,
  intervalMs = 100,
) {
  const startTimeMs = Date.now();
  while (Date.now() - startTimeMs < timeoutMs) {
    if (condition()) {
      return;
    }
    await sleepMs(intervalMs);
  }
  throw new Error('Timed out waiting for condition');
}
