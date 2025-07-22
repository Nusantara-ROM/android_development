/**
 * @fileoverview A description of this module.  What would someone
 * new to your team want to know about the code in this file?
 * (DO NOT SUBMIT as is; replace this comment.)
 */

import {getRootUrl} from 'common/url_utils';

export async function getFixtureFile(
  srcFilename: string,
  dstFilename: string = srcFilename,
): Promise<File> {
  const url = getRootUrl() + 'base/src/test/fixtures/' + srcFilename;
  const response = await fetch(url);
  expect(response.ok).toBeTrue();
  const blob = await response.blob();
  const file = new File([blob], dstFilename);
  return file;
}
