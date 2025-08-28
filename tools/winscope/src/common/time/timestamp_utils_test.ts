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

import {
  makeRealTimestamp,
  timestampEqualityTester,
} from 'test/unit/time_test_helpers';
import {
  compareFn,
  isHumanElapsedTimeFormat,
  isISOFormat,
  isNsFormat,
  isRealDateTimeFormat,
  isRealTimeOnlyFormat,
} from './timestamp_utils';

describe('timestamp_utils', () => {
  beforeAll(() => {
    jasmine.addCustomEqualityTester(timestampEqualityTester);
  });

  describe('compareFn', () => {
    it('allows to sort arrays', () => {
      const array = [
        makeRealTimestamp(100n),
        makeRealTimestamp(10n),
        makeRealTimestamp(12n),
        makeRealTimestamp(110n),
        makeRealTimestamp(11n),
      ];
      array.sort(compareFn);

      const expected = [
        makeRealTimestamp(10n),
        makeRealTimestamp(11n),
        makeRealTimestamp(12n),
        makeRealTimestamp(100n),
        makeRealTimestamp(110n),
      ];
      expect(array).toEqual(expected);
    });
  });

  describe('isNsFormat', () => {
    it('accepts all expected inputs', () => {
      expect(isNsFormat('123')).toBeTrue();
      expect(isNsFormat('123ns')).toBeTrue();
      expect(isNsFormat('123 ns')).toBeTrue();
      expect(isNsFormat(' 123 ns ')).toBeTrue();
      expect(isNsFormat('   123  ')).toBeTrue();
    });

    it('rejects all expected inputs', () => {
      expect(isNsFormat('1a23')).toBeFalse();
      expect(isNsFormat('a123 ns')).toBeFalse();
      expect(isNsFormat('')).toBeFalse();
    });
  });

  describe('isHumanElapsedTimeFormat', () => {
    it('accepts all expected inputs', () => {
      expect(isHumanElapsedTimeFormat('1000ns')).toBeTrue();
      expect(isHumanElapsedTimeFormat('1ms')).toBeTrue();
      expect(isHumanElapsedTimeFormat('1s')).toBeTrue();
      expect(isHumanElapsedTimeFormat('1s0ms')).toBeTrue();
      expect(isHumanElapsedTimeFormat('1s0ms0ns')).toBeTrue();
      expect(isHumanElapsedTimeFormat('0d1s1ms')).toBeTrue();
      expect(isHumanElapsedTimeFormat('1h0m')).toBeTrue();
      expect(isHumanElapsedTimeFormat('1h1m1s1ms')).toBeTrue();
      expect(isHumanElapsedTimeFormat('1d0s1ms')).toBeTrue();
      expect(isHumanElapsedTimeFormat('1d1h0m1s1ms')).toBeTrue();
      expect(isHumanElapsedTimeFormat('1d')).toBeTrue();
    });

    it('rejects all expected inputs', () => {
      expect(isHumanElapsedTimeFormat('1n')).toBeFalse();
      expect(isHumanElapsedTimeFormat('1hr')).toBeFalse();
      expect(isHumanElapsedTimeFormat('1min')).toBeFalse();
      expect(isHumanElapsedTimeFormat('1sec')).toBeFalse();
      expect(isHumanElapsedTimeFormat('1')).toBeFalse();
      expect(isHumanElapsedTimeFormat('1m0')).toBeFalse();
    });
  });

  describe('isRealTimeOnlyFormat', () => {
    it('accepts all expected inputs', () => {
      expect(isRealTimeOnlyFormat('22:04:54.186')).toBeTrue();
      expect(isRealTimeOnlyFormat('22:04:54.186777')).toBeTrue();
      expect(isRealTimeOnlyFormat('22:04:54.186234769')).toBeTrue();
    });

    it('rejects all expected inputs', () => {
      expect(
        isRealTimeOnlyFormat('2022-11-10, 22:04:54.186123456'),
      ).toBeFalse();
      expect(isRealTimeOnlyFormat('2022-11-10T22:04:54.186123456')).toBeFalse();
      expect(isRealTimeOnlyFormat('2:04:54.186123456')).toBeFalse();
      expect(isRealTimeOnlyFormat('25:04:54.186123456')).toBeFalse();
      expect(isRealTimeOnlyFormat('22:4:54.186123456')).toBeFalse();
      expect(isRealTimeOnlyFormat('22:04:4.186123456')).toBeFalse();
      expect(isRealTimeOnlyFormat('22:60:54.186123456')).toBeFalse();
      expect(isRealTimeOnlyFormat('22:04:60.186123456')).toBeFalse();
      expect(isRealTimeOnlyFormat('22:04:54.1861234562')).toBeFalse();
      expect(isRealTimeOnlyFormat('22:04:54.')).toBeFalse();
    });
  });

  describe('isRealDateTimeFormat', () => {
    it('accepts all expected inputs', () => {
      expect(isRealDateTimeFormat('2022-11-10, 22:04:54.186')).toBeTrue();
      expect(isRealDateTimeFormat('2022-11-10, 22:04:54.186777')).toBeTrue();
      expect(isRealDateTimeFormat('2022-11-10, 22:04:54.186234769')).toBeTrue();
    });

    it('rejects all expected inputs', () => {
      expect(isRealDateTimeFormat('2022-11-10T22:04:54.186234769')).toBeFalse();
      expect(
        isRealDateTimeFormat('2022-13-10, 22:04:54.186123456'),
      ).toBeFalse();
      expect(
        isRealDateTimeFormat('2022-11-32, 22:04:54.186123456'),
      ).toBeFalse();
      expect(
        isRealDateTimeFormat('2022-11-10, 25:04:54.186123456'),
      ).toBeFalse();
      expect(
        isRealDateTimeFormat('2022-11-10, 22:60:54.186123456'),
      ).toBeFalse();
      expect(
        isRealDateTimeFormat('2022-11-10, 22:04:60.186123456'),
      ).toBeFalse();
      expect(
        isRealDateTimeFormat('2022-11-10, 22:04:54.1861234568'),
      ).toBeFalse();
      expect(isRealDateTimeFormat('2022-11-10, 22:04:54.')).toBeFalse();
    });
  });

  describe('isISOFormat', () => {
    it('accepts all expected inputs', () => {
      expect(isISOFormat('2022-11-10T22:04:54.186')).toBeTrue();
      expect(isISOFormat('2022-11-10T22:04:54.186777')).toBeTrue();
      expect(isISOFormat('2022-11-10T22:04:54.186234769')).toBeTrue();
    });

    it('rejects all expected inputs', () => {
      expect(isISOFormat('2022-11-10, 22:04:54.186234769')).toBeFalse();
      expect(isISOFormat('2022-13-10T22:04:54.186123456')).toBeFalse();
      expect(isISOFormat('2022-11-32T22:04:54.186123456')).toBeFalse();
      expect(isISOFormat('2022-11-10T25:04:54.186123456')).toBeFalse();
      expect(isISOFormat('2022-11-10T22:60:54.186123456')).toBeFalse();
      expect(isISOFormat('2022-11-10T22:04:60.186123456')).toBeFalse();
      expect(isISOFormat('2022-11-10T22:04:54.1861234568')).toBeFalse();
      expect(isISOFormat('2022-11-10T22:04:54.')).toBeFalse();
    });
  });
});
