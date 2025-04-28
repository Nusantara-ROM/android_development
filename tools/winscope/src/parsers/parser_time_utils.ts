/*
 * Copyright (C) 2023 The Android Open Source Project
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

import {Parser} from 'trace/parser';

export function getParserWithLatestRealToBootTimeOffset(
  parsers: Array<Parser<object>>,
): Parser<object> | undefined {
  return parsers
    .filter((parser) => parser.getRealToBootTimeOffsetNs() !== undefined)
    .sort((a, b) => {
      return Number(
        (a.getRealToBootTimeOffsetNs() ?? 0n) -
          (b.getRealToBootTimeOffsetNs() ?? 0n),
      );
    })
    .at(-1);
}

export function getParserWithLatestRealToMonotonicTimeOffset(
  parsers: Array<Parser<object>>,
): Parser<object> | undefined {
  return parsers
    .filter((parser) => parser.getRealToMonotonicTimeOffsetNs() !== undefined)
    .sort((a, b) => {
      return Number(
        (a.getRealToMonotonicTimeOffsetNs() ?? 0n) -
          (b.getRealToMonotonicTimeOffsetNs() ?? 0n),
      );
    })
    .at(-1);
}
