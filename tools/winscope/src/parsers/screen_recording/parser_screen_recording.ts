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
  searchSubarray,
  toIntLittleEndian,
  toUintLittleEndian,
} from 'common/array_utils';
import {FileUtils} from 'common/file_utils';
import {Timestamp} from 'common/time/time';
import {TIME_UNIT_TO_NANO} from 'common/time/time_units';
import {ParserTimestampConverter} from 'common/time/timestamp_converter';
import {MonotonicScreenRecording} from 'messaging/user_warnings';
import {createFile, MP4ArrayBuffer, MP4File, Sample} from 'mp4box';
import {AbstractParser} from 'parsers/legacy/abstract_parser';
import {UserNotifier} from 'services/user_notifier';
import {ScreenRecordingUtils} from 'trace/screen_recording_utils';
import {TraceFile} from 'trace/trace_file';
import {CoarseVersion} from 'trace_api/coarse_version';
import {MediaBasedTraceEntry} from 'trace_api/media_based_trace_entry';
import {ScreenRecordingOffsets, TraceMetadata} from 'trace_api/trace_metadata';
import {TraceType} from 'trace_api/trace_type';

export class ParserScreenRecording extends AbstractParser<
  MediaBasedTraceEntry,
  bigint
> {
  private realToBootTimeOffsetNs: bigint | undefined;
  private makeTimestampFromExactValue = false;

  constructor(
    trace: TraceFile,
    timestampConverter: ParserTimestampConverter,
    metadata: TraceMetadata,
  ) {
    super(trace, timestampConverter, metadata);
  }

  override getTraceType(): TraceType {
    return TraceType.SCREEN_RECORDING;
  }

  override getCoarseVersion(): CoarseVersion {
    return CoarseVersion.LATEST;
  }

  override getMagicNumber(): number[] {
    return ParserScreenRecording.MPEG4_MAGIC_NUMBER;
  }

  override getRealToMonotonicTimeOffsetNs(): bigint | undefined {
    return undefined;
  }

  override getRealToBootTimeOffsetNs(): bigint | undefined {
    return this.realToBootTimeOffsetNs;
  }

  override async decodeTrace(videoData: Uint8Array): Promise<Array<bigint>> {
    const posVersion = this.searchMagicString(videoData);
    if (posVersion !== undefined) {
      return this.parseTimestampsUsingEmbeddedMetadata(videoData, posVersion);
    }

    if (this.metadata?.screenRecordingOffsets !== undefined) {
      return await this.parseTimestampsUsingExternalMetadata(
        videoData,
        this.metadata.screenRecordingOffsets,
      );
    }

    // try parse offset from filename
    let filename = FileUtils.removeDirFromFileName(this.traceFile.file.name);
    filename = FileUtils.removeExtensionFromFilename(filename);
    let offsetMs = AndroidScreenRecording.tryParseFilename(filename);
    if (offsetMs === undefined) {
      offsetMs = ScreenRecordingWithUID.tryParseFilename(filename);
    }

    if (offsetMs !== undefined) {
      try {
        const offset = BigInt(offsetMs) * BigInt(TIME_UNIT_TO_NANO.ms);
        return await this.parseTimestampsUsingFilenameOffset(videoData, offset);
      } catch (e) {
        console.error(e);
      }
    }

    throw new TypeError(
      'Cannot parse screen recording. Video data does not contain winscope magic string. ' +
        'Metadata JSON not provided. ' +
        'Filename does not contain offset.',
    );
  }

  protected override getTimestamp(decodedEntry: bigint): Timestamp {
    if (this.makeTimestampFromExactValue) {
      return this.timestampConverter.makeTimestampFromRealNs(decodedEntry);
    }
    return this.timestampConverter.makeTimestampFromBootTimeNs(decodedEntry);
  }

  override processDecodedEntry(
    index: number,
    entry: bigint,
  ): MediaBasedTraceEntry {
    const videoTimeSeconds = ScreenRecordingUtils.timestampToVideoTimeSeconds(
      this.decodedEntries[0],
      entry,
    );
    const videoData = this.traceFile.file;
    return new MediaBasedTraceEntry(videoTimeSeconds, videoData);
  }

  private searchMagicString(videoData: Uint8Array): number | undefined {
    let pos = searchSubarray(
      videoData,
      ParserScreenRecording.WINSCOPE_META_MAGIC_STRING,
    );
    if (pos === undefined) {
      return undefined;
    }
    pos += ParserScreenRecording.WINSCOPE_META_MAGIC_STRING.length;
    return pos;
  }

  private parseTimestampsUsingEmbeddedMetadata(
    videoData: Uint8Array,
    posVersion: number,
  ): Array<bigint> {
    const [posCount, timeOffsetNs] = this.getOffsetAndCountFromPosVersion(
      videoData,
      posVersion,
    );
    const [posTimestamps, count] = this.parseFramesCount(videoData, posCount);
    this.realToBootTimeOffsetNs = timeOffsetNs;
    const timestampsElapsedNs = this.parseTimestampsElapsedNs(
      videoData,
      posTimestamps,
      count,
    );
    return timestampsElapsedNs;
  }

  private getOffsetAndCountFromPosVersion(
    videoData: Uint8Array,
    posVersion: number,
  ): [number, bigint] {
    const [posTimeOffset, metadataVersion] = this.parseMetadataVersion(
      videoData,
      posVersion,
    );

    if (metadataVersion !== 1 && metadataVersion !== 2) {
      throw new TypeError(
        `Metadata version "${metadataVersion}" not supported`,
      );
    }

    if (metadataVersion === 1) {
      // UI traces contain "elapsed" timestamps (SYSTEM_TIME_BOOTTIME), whereas
      // metadata Version 1 contains SYSTEM_TIME_MONOTONIC timestamps.
      //
      // Here we are pretending that metadata Version 1 contains "elapsed"
      // timestamps as well, in order to synchronize with the other traces.
      //
      // If no device suspensions are involved, SYSTEM_TIME_MONOTONIC should
      // indeed correspond to SYSTEM_TIME_BOOTTIME and things will work as
      // expected.
      UserNotifier.add(new MonotonicScreenRecording());
    }

    return this.parseRealToBootTimeOffsetNs(videoData, posTimeOffset);
  }

  private parseMetadataVersion(
    videoData: Uint8Array,
    pos: number,
  ): [number, number] {
    if (pos + 4 > videoData.length) {
      throw new TypeError(
        'Failed to parse metadata version. Video data is too short.',
      );
    }
    const version = Number(toUintLittleEndian(videoData, pos, pos + 4));
    pos += 4;
    return [pos, version];
  }

  private parseRealToBootTimeOffsetNs(
    videoData: Uint8Array,
    pos: number,
  ): [number, bigint] {
    if (pos + 8 > videoData.length) {
      throw new TypeError(
        'Failed to parse realtime-to-elapsed time offset. Video data is too short.',
      );
    }
    const offset = toIntLittleEndian(videoData, pos, pos + 8);
    pos += 8;
    return [pos, offset];
  }

  private parseFramesCount(
    videoData: Uint8Array,
    pos: number,
  ): [number, number] {
    if (pos + 4 > videoData.length) {
      throw new TypeError(
        'Failed to parse frames count. Video data is too short.',
      );
    }
    const count = Number(toUintLittleEndian(videoData, pos, pos + 4));
    pos += 4;
    return [pos, count];
  }

  private parseTimestampsElapsedNs(
    videoData: Uint8Array,
    pos: number,
    count: number,
  ): Array<bigint> {
    if (pos + count * 8 > videoData.length) {
      throw new TypeError(
        'Failed to parse timestamps. Video data is too short.',
      );
    }
    const timestamps: Array<bigint> = [];
    for (let i = 0; i < count; ++i) {
      const timestamp = toUintLittleEndian(videoData, pos, pos + 8);
      pos += 8;
      timestamps.push(timestamp);
    }
    return timestamps;
  }

  private async parseTimestampsUsingExternalMetadata(
    videoData: Uint8Array,
    metadata: ScreenRecordingOffsets,
  ): Promise<Array<bigint>> {
    this.realToBootTimeOffsetNs = metadata.realToElapsedTimeOffsetNanos;
    const timestampsElapsedNs = await this.parseTimestampsFromMp4(
      videoData.buffer.slice(
        videoData.byteOffset,
        videoData.byteLength + videoData.byteOffset,
      ),
      metadata.elapsedRealTimeNanos,
    );
    return timestampsElapsedNs;
  }

  private async parseTimestampsUsingFilenameOffset(
    videoData: Uint8Array,
    offset: bigint,
  ): Promise<Array<bigint>> {
    // cannot set boot time offset as we only have the start time of the recording
    this.realToBootTimeOffsetNs = 0n;
    this.makeTimestampFromExactValue = true;
    const timestampsElapsedNs = await this.parseTimestampsFromMp4(
      videoData.buffer.slice(
        videoData.byteOffset,
        videoData.byteLength + videoData.byteOffset,
      ),
      offset,
    );
    return timestampsElapsedNs;
  }

  private async parseTimestampsFromMp4(
    arrayBuffer: ArrayBuffer | SharedArrayBuffer,
    elapsedRealTimeNanos: bigint,
  ): Promise<Array<bigint>> {
    const timestamps: Array<bigint> = [];
    // There's an export issue with the createFile alias for TypeScript (1.5.0 - Jun 2025)
    // It fails with the error below, use this as a bypass until the library is fixed.
    // ERROR in src/parsers/screen_recording/parser_screen_recording.ts:288:48
    // - error TS2554: Expected 0 arguments, but got 2.
    const createFileAny = createFile as any;
    const mp4File: MP4File = createFileAny(true, undefined);
    await new Promise<void>((resolve) => {
      mp4File.onReady = (info) => {
        mp4File.onSamples = (id, user, samples) => {
          let curr = elapsedRealTimeNanos;
          samples.forEach((sample: Sample) => {
            const timeSeconds = sample.duration / sample.timescale;
            const timeNs = BigInt(
              Math.floor(TIME_UNIT_TO_NANO.s * timeSeconds),
            );
            curr += timeNs;
            timestamps.push(curr);
          });
          resolve();
        };
        mp4File.setExtractionOptions(info.tracks[0].id);
      };
      const buffer = arrayBuffer as MP4ArrayBuffer;
      buffer.fileStart = 0;
      mp4File.appendBuffer(buffer);
      mp4File.start();
    });
    return timestamps;
  }

  private static readonly MPEG4_MAGIC_NUMBER = [
    0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x6d, 0x70, 0x34, 0x32,
  ]; // ....ftypmp42
  private static readonly WINSCOPE_META_MAGIC_STRING = [
    0x23, 0x56, 0x56, 0x31, 0x4e, 0x53, 0x43, 0x30, 0x50, 0x45, 0x54, 0x31,
    0x4d, 0x45, 0x32, 0x23,
  ]; // #VV1NSC0PET1ME2#
}

const START_TIME_REGEX = /^[0-9]+$/;

class AndroidScreenRecording {
  private static readonly DATE_REGEX = /^[0-9]{4}[0-9]{2}[0-9]{2}$/;
  private static readonly TIME_REGEX = /^[0-9]{2}[0-9]{2}[0-9]{2}$/;

  static tryParseFilename(filename: string): bigint | undefined {
    // expected filename: screen-YYYYMMDD-HHmmss-<start_time_ms>
    const [screen, saveDate, saveTime, startTimeMs] = filename.split('-');
    if (!screen.endsWith('screen')) {
      return undefined;
    }
    if (
      saveDate === undefined ||
      !AndroidScreenRecording.DATE_REGEX.test(saveDate)
    ) {
      return undefined;
    }
    if (
      saveTime === undefined ||
      !AndroidScreenRecording.TIME_REGEX.test(saveTime)
    ) {
      return undefined;
    }
    if (startTimeMs === undefined || !START_TIME_REGEX.test(startTimeMs)) {
      return undefined;
    }

    return BigInt(startTimeMs);
  }
}

class ScreenRecordingWithUID {
  private static readonly DATE_REGEX = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
  private static readonly TIME_REGEX = /^[0-9]{2}-[0-9]{2}-[0-9]{2}$/;
  private static readonly UID_REGEX = /^[0-9a-f]{32}$/;

  static tryParseFilename(filename: string): bigint | undefined {
    // expected filename: YYYY-MM-DD_HH-mm-ss-<uid>-<start_time_ms>-screen
    const [date, rem] = filename.split('_');
    if (rem === undefined || !ScreenRecordingWithUID.DATE_REGEX.test(date)) {
      return undefined;
    }
    const time = rem.slice(0, 8);
    if (!ScreenRecordingWithUID.TIME_REGEX.test(time)) {
      return undefined;
    }

    const [uid, startTimeMs, suffix] = rem.slice(9).split('-');
    if (!ScreenRecordingWithUID.UID_REGEX.test(uid)) {
      return undefined;
    }
    if (suffix !== 'screen') {
      return undefined;
    }
    if (startTimeMs === undefined || !START_TIME_REGEX.test(startTimeMs)) {
      return undefined;
    }

    return BigInt(startTimeMs);
  }
}
