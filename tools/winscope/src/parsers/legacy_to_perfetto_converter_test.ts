/*
 * Copyright (C) 2025 The Android Open Source Project
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

import {assertDefined} from 'common/assert_utils';
import {TimestampConverterUtils} from 'common/time/test_utils';
import Long from 'long';
import {perfetto} from 'protos/perfetto/trace/static';
import {ParserBuilder} from 'test/unit/parser_builder';
import {Parser} from 'trace/parser';
import {TraceFile} from 'trace/trace_file';
import {
  ClockSnapshot,
  LegacyToPerfettoConverter,
} from './legacy_to_perfetto_converter';

describe('LegacyToPerfettoConverter', () => {
  const testPacketBoottime = perfetto.protos.TracePacket.create({
    trustedPacketSequenceId: 1,
    timestamp: Long.fromInt(10, true),
    timestampClockId:
      perfetto.protos.ClockSnapshot.Clock.BuiltinClocks.BOOTTIME,
  });
  const testPacketMonotonic = perfetto.protos.TracePacket.create({
    trustedPacketSequenceId: 2,
    timestamp: Long.fromInt(20, true),
    timestampClockId:
      perfetto.protos.ClockSnapshot.Clock.BuiltinClocks.MONOTONIC,
  });
  const legacyClock1 = {realtime: 50n, boottime: 30n, monotonic: 40n};
  const clockSnapshot1 = makeExpectedClockSnapshot(legacyClock1);
  const emptyPacket = perfetto.protos.TracePacket.create();
  const existingPerfettoFile = makeExistingPerfettoFile(
    clockSnapshot1,
    emptyPacket,
  );

  it('converts multiple legacy files to new perfetto file', async () => {
    const parser1 = makeParser(testPacketBoottime);
    spyOn(parser1, 'getRealToMonotonicTimeOffsetNs').and.returnValue(undefined);
    const parser2 = makeParser(testPacketMonotonic);
    spyOn(parser2, 'getRealToMonotonicTimeOffsetNs').and.returnValue(undefined);

    const perfettoFile =
      await LegacyToPerfettoConverter.convertToSinglePerfettoFile(
        [parser1, parser2],
        [parser1, parser2],
      );
    const trace = await checkAndDecodePerfettoFile(assertDefined(perfettoFile));
    expect(trace.packet).toEqual([
      makeExpectedClockSnapshot({
        realtime: 10n,
        boottime: 10n,
        monotonic: undefined,
      }),
      makeExpectedClockSnapshot({
        realtime: 20n,
        boottime: 20n,
        monotonic: undefined,
      }),
      testPacketBoottime,
      testPacketMonotonic,
    ]);
  });

  it('adds multiple legacy files to existing perfetto file', async () => {
    const parser1 = makeParser(testPacketBoottime);
    const parser2 = makeParser(testPacketMonotonic);

    const perfettoFile =
      await LegacyToPerfettoConverter.convertToSinglePerfettoFile(
        [parser1, parser2],
        [parser1, parser2],
        existingPerfettoFile,
      );
    const trace = await checkAndDecodePerfettoFile(assertDefined(perfettoFile));
    expect(trace.packet).toEqual([
      clockSnapshot1,
      emptyPacket,
      testPacketBoottime,
      testPacketMonotonic,
    ]);
  });

  it('ignores legacy file that cannot be converted to perfetto format', async () => {
    const parser1 = makeParser();

    expect(
      await LegacyToPerfettoConverter.convertToSinglePerfettoFile(
        [parser1],
        [parser1],
      ),
    ).toBeUndefined();

    expect(
      await LegacyToPerfettoConverter.convertToSinglePerfettoFile(
        [parser1],
        [parser1],
        existingPerfettoFile,
      ),
    ).toBeUndefined();

    const parser2 = makeParser(testPacketMonotonic);
    const perfettoFile =
      await LegacyToPerfettoConverter.convertToSinglePerfettoFile(
        [parser1, parser2],
        [parser1, parser2],
        existingPerfettoFile,
      );
    const trace = await checkAndDecodePerfettoFile(assertDefined(perfettoFile));
    expect(trace.packet).toEqual([
      clockSnapshot1,
      emptyPacket,
      testPacketMonotonic,
    ]);
  });

  it('converts elapsed legacy trace to new perfetto trace', async () => {
    const parser = makeParser(testPacketBoottime);
    spyOn(parser, 'getRealToBootTimeOffsetNs').and.returnValue(undefined);
    spyOn(parser, 'getRealToMonotonicTimeOffsetNs').and.returnValue(undefined);

    const perfettoFile =
      await LegacyToPerfettoConverter.convertToSinglePerfettoFile(
        [parser],
        [parser],
      );
    const trace = await checkAndDecodePerfettoFile(assertDefined(perfettoFile));
    expect(trace.packet).toEqual([
      makeExpectedClockSnapshot({
        realtime: 10n,
        boottime: 10n,
        monotonic: 10n,
      }),
      testPacketBoottime,
    ]);
  });

  it('converts legacy trace with real-to-boottime offset', async () => {
    const parser = makeParser(testPacketBoottime);
    spyOn(parser, 'getRealToBootTimeOffsetNs').and.returnValue(3n);
    spyOn(parser, 'getRealToMonotonicTimeOffsetNs').and.returnValue(undefined);

    const perfettoFile =
      await LegacyToPerfettoConverter.convertToSinglePerfettoFile(
        [parser],
        [parser],
      );
    const trace = await checkAndDecodePerfettoFile(assertDefined(perfettoFile));
    expect(trace.packet).toEqual([
      makeExpectedClockSnapshot({
        realtime: 10n,
        boottime: 7n,
        monotonic: undefined,
      }),
      testPacketBoottime,
    ]);
  });

  it('converts legacy trace with real-to-monotonic offset', async () => {
    const parser = makeParser(testPacketMonotonic);
    spyOn(parser, 'getRealToBootTimeOffsetNs').and.returnValue(undefined);
    spyOn(parser, 'getRealToMonotonicTimeOffsetNs').and.returnValue(3n);

    const perfettoFile =
      await LegacyToPerfettoConverter.convertToSinglePerfettoFile(
        [parser],
        [parser],
      );
    const trace = await checkAndDecodePerfettoFile(assertDefined(perfettoFile));
    expect(trace.packet).toEqual([
      makeExpectedClockSnapshot({
        realtime: 20n,
        boottime: 17n,
        monotonic: 17n,
      }),
      testPacketMonotonic,
    ]);
  });

  it('with boot-time and monotonically offset parsers loaded', async () => {
    const parserBoottime = makeParser(testPacketBoottime);
    spyOn(parserBoottime, 'getRealToBootTimeOffsetNs').and.returnValue(2n);
    spyOn(parserBoottime, 'getRealToMonotonicTimeOffsetNs').and.returnValue(
      undefined,
    );

    const parserMonotonic = makeParser(testPacketMonotonic);
    spyOn(parserMonotonic, 'getRealToBootTimeOffsetNs').and.returnValue(
      undefined,
    );
    spyOn(parserMonotonic, 'getRealToMonotonicTimeOffsetNs').and.returnValue(
      3n,
    );

    const perfettoFile =
      await LegacyToPerfettoConverter.convertToSinglePerfettoFile(
        [parserMonotonic],
        [parserMonotonic, parserBoottime],
      );
    const trace = await checkAndDecodePerfettoFile(assertDefined(perfettoFile));
    expect(trace.packet).toEqual([
      makeExpectedClockSnapshot({
        realtime: 10n,
        boottime: 8n,
        monotonic: 7n,
      }),
      makeExpectedClockSnapshot({
        realtime: 20n,
        boottime: 18n,
        monotonic: 17n,
      }),
      testPacketMonotonic,
    ]);
  });

  it('robust to errors in packet conversion', async () => {
    const parser = makeParser(undefined, true);
    expect(
      await LegacyToPerfettoConverter.convertToSinglePerfettoFile(
        [parser],
        [parser],
      ),
    ).toBeUndefined();
  });

  it('throws error if allParsers empty and no Perfetto file provided', async () => {
    const parser = makeParser(undefined, true);
    await expectAsync(
      LegacyToPerfettoConverter.convertToSinglePerfettoFile([parser], []),
    ).toBeRejectedWithError('allParsers empty and no Perfetto file provided');
  });

  function makeExistingPerfettoFile(
    clockSnapshot20: perfetto.protos.TracePacket,
    emptyPacket: perfetto.protos.TracePacket,
  ) {
    const existingTrace = perfetto.protos.Trace.fromObject({
      packet: [clockSnapshot20, emptyPacket],
    });
    return new TraceFile(
      new File(
        [perfetto.protos.Trace.encode(existingTrace).finish()],
        'existing_trace',
      ),
    );
  }

  function makeParser(
    testPacket?: perfetto.protos.TracePacket,
    conversionError = false,
  ): Parser<object> {
    const ts = BigInt(testPacket?.timestamp.toString() ?? 0n);
    const parser = new ParserBuilder<object>()
      .setEntries([{}])
      .setTimestamps([TimestampConverterUtils.makeRealTimestamp(ts)])
      .build();
    if (testPacket) {
      const parserConvertSpy = jasmine.createSpy();
      parserConvertSpy.and.returnValue([testPacket]);
      parser.convertToPerfettoPackets = parserConvertSpy;
    } else if (conversionError) {
      const parserConvertSpy = jasmine.createSpy();
      parserConvertSpy.and.throwError(new Error('conversion failed'));
      parser.convertToPerfettoPackets = parserConvertSpy;
    }
    return parser;
  }

  async function checkAndDecodePerfettoFile(
    perfettoFile: TraceFile,
  ): Promise<perfetto.protos.Trace> {
    const expectedPerfettoTraceName = 'combined_winscope_trace.perfetto-trace';
    expect(perfettoFile.getDescriptor()).toEqual(expectedPerfettoTraceName);
    const fileBuffer = new Uint8Array(await perfettoFile.file.arrayBuffer());
    return perfetto.protos.Trace.decode(fileBuffer);
  }

  function makeExpectedClockSnapshot(
    clockSnapshot: ClockSnapshot,
  ): perfetto.protos.TracePacket {
    const realtime = Long.fromString(clockSnapshot.realtime.toString());
    const clocks = [
      {
        clockId:
          perfetto.protos.ClockSnapshot.Clock.BuiltinClocks.REALTIME_COARSE,
        timestamp: realtime,
      },
      {
        clockId: perfetto.protos.ClockSnapshot.Clock.BuiltinClocks.REALTIME,
        timestamp: realtime,
      },
    ];

    if (clockSnapshot.boottime) {
      clocks.push({
        clockId: perfetto.protos.ClockSnapshot.Clock.BuiltinClocks.BOOTTIME,
        timestamp: Long.fromString(clockSnapshot.boottime.toString()),
      });
    }

    if (clockSnapshot.monotonic) {
      const monotonic = Long.fromString(clockSnapshot.monotonic.toString());
      clocks.push(
        ...[
          {
            clockId:
              perfetto.protos.ClockSnapshot.Clock.BuiltinClocks.MONOTONIC,
            timestamp: monotonic,
          },
          {
            clockId:
              perfetto.protos.ClockSnapshot.Clock.BuiltinClocks
                .MONOTONIC_COARSE,
            timestamp: monotonic,
          },
          {
            clockId:
              perfetto.protos.ClockSnapshot.Clock.BuiltinClocks.MONOTONIC_RAW,
            timestamp: monotonic,
          },
        ],
      );
    }

    return perfetto.protos.TracePacket.fromObject({
      trustedPacketSequenceId: 1,
      clockSnapshot: {
        clocks,
      },
    });
  }
});
