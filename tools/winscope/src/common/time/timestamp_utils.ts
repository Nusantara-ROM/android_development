/*
 * Copyright (C) 2022 The Android Open Source Project
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

import {Timestamp} from './time';

/**
 * Utility functions for working with timestamps.
 */
// (?=.) checks there is at least one character with a lookahead match
const REAL_TIME_ONLY_REGEX =
  /^(0[0-9]|1[0-9]|2[0-3]):(0[0-9]|[1-5][0-9]):(0[0-9]|[1-5][0-9])(\.[0-9]{1,9})?Z?$/;
const REAL_DATE_TIME_REGEX =
  /^[0-9]{4}-((0[13578]|1[02])-(0[1-9]|[12][0-9]|3[01])|(0[469]|11)-(0[1-9]|[12][0-9]|30)|(02)-(0[1-9]|[12][0-9])),\s(0[0-9]|1[0-9]|2[0-3]):(0[0-9]|[1-5][0-9]):(0[0-9]|[1-5][0-9])(\.[0-9]{1,9})?Z?$/;
const ISO_TIMESTAMP_REGEX =
  /^[0-9]{4}-((0[13578]|1[02])-(0[1-9]|[12][0-9]|3[01])|(0[469]|11)-(0[1-9]|[12][0-9]|30)|(02)-(0[1-9]|[12][0-9]))T(0[0-9]|1[0-9]|2[0-3]):(0[0-9]|[1-5][0-9]):(0[0-9]|[1-5][0-9])(\.[0-9]{1,9})?Z?$/;
const ELAPSED_TIME_REGEX =
  /^(?=.)([0-9]+d)?([0-9]+h)?([0-9]+m)?([0-9]+s)?([0-9]+ms)?([0-9]+ns)?$/;
const NS_TIME_REGEX = /^\s*[0-9]+(\s?ns)?\s*$/;

/**
 * Checks if a string is in nanosecond format.
 *
 * @param timestampHuman The string to check.
 * @return True if the string is in nanosecond format, false otherwise.
 */
export function isNsFormat(timestampHuman: string): boolean {
  return NS_TIME_REGEX.test(timestampHuman);
}

/**
 * Checks if a string is in human-readable elapsed time format.
 *
 * @param timestampHuman The string to check.
 * @return True if the string is in elapsed time format, false otherwise.
 */
export function isHumanElapsedTimeFormat(timestampHuman: string): boolean {
  return ELAPSED_TIME_REGEX.test(timestampHuman);
}

/**
 * Checks if a string is in real time format (HH:mm:ss.ns).
 *
 * @param timestampHuman The string to check.
 * @return True if the string is in real time format, false otherwise.
 */
export function isRealTimeOnlyFormat(timestampHuman: string): boolean {
  return REAL_TIME_ONLY_REGEX.test(timestampHuman);
}

/**
 * Checks if a string is in real date and time format (YYYY-MM-DD, HH:mm:ss.ns).
 *
 * @param timestampHuman The string to check.
 * @return True if the string is in real date and time format, false otherwise.
 */
export function isRealDateTimeFormat(timestampHuman: string): boolean {
  return REAL_DATE_TIME_REGEX.test(timestampHuman);
}

/**
 * Checks if a string is in ISO 8601 format (YYYY-MM-DDTHH:mm:ss.nsZ).
 *
 * @param timestampHuman The string to check.
 * @return True if the string is in ISO 8601 format, false otherwise.
 */
export function isISOFormat(timestampHuman: string): boolean {
  return ISO_TIMESTAMP_REGEX.test(timestampHuman);
}

/**
 * Checks if a string is in a human-readable real timestamp format.
 *
 * @param timestampHuman The string to check.
 * @return True if the string is in a human-readable real timestamp format, false otherwise.
 */
export function isHumanRealTimestampFormat(timestampHuman: string): boolean {
  return (
    isISOFormat(timestampHuman) ||
    isRealDateTimeFormat(timestampHuman) ||
    isRealTimeOnlyFormat(timestampHuman)
  );
}

/**
 * Extracts the date from a human-readable timestamp string.
 *
 * @param timestampHuman The timestamp string.
 * @return The date string, or undefined if the format is not supported.
 */
export function extractDateFromHumanTimestamp(
  timestampHuman: string,
): string | undefined {
  if (!isRealDateTimeFormat(timestampHuman) && !isISOFormat(timestampHuman)) {
    return undefined;
  }
  return timestampHuman.slice(0, 10);
}

/**
 * Extracts the time from a human-readable timestamp string.
 *
 * @param timestampHuman The timestamp string.
 * @return The time string, or undefined if the format is not supported.
 */
export function extractTimeFromHumanTimestamp(
  timestampHuman: string,
): string | undefined {
  if (isRealDateTimeFormat(timestampHuman)) {
    return timestampHuman.slice(12);
  }
  if (isISOFormat(timestampHuman)) {
    return timestampHuman.slice(11);
  }
  if (isRealTimeOnlyFormat(timestampHuman)) {
    return timestampHuman;
  }
  return undefined;
}

/**
 * Compares two timestamps.
 *
 * @param a The first timestamp.
 * @param b The second timestamp.
 * @return A negative number if a < b, a positive number if a > b, and 0 if a === b.
 */
export function compareFn(a: Timestamp, b: Timestamp): number {
  return Number(a.getValueNs() - b.getValueNs());
}

/**
 * Returns the minimum of two timestamps.
 *
 * @param ts1 The first timestamp.
 * @param ts2 The second timestamp.
 * @return The minimum of the two timestamps.
 */
export function minTimestamp(ts1: Timestamp, ts2: Timestamp): Timestamp {
  if (ts2.getValueNs() < ts1.getValueNs()) {
    return ts2;
  }

  return ts1;
}

/**
 * Returns the maximum of two timestamps.
 *
 * @param ts1 The first timestamp.
 * @param ts2 The second timestamp.
 * @return The maximum of the two timestamps.
 */
export function maxTimestamp(ts1: Timestamp, ts2: Timestamp): Timestamp {
  if (ts2.getValueNs() > ts1.getValueNs()) {
    return ts2;
  }

  return ts1;
}
