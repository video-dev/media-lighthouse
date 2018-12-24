// @ts-nocheck
import * as URLToolkit from 'url-toolkit';

import LevelKey from './level-key';

export default class Fragment {
  public tagList: string[][] = [];
  public programDateTime: number;
  public rawProgramDateTime: string;
  public relurl: string;
  public baseurl: string;
  public rawByteRange: string;
  public duration: number;
  public levelkey: LevelKey;
  public sn: number | string = 0;
  public data: any;
  public title: string;
  public start: number;
  public type: string;
  public cc: number;
  public level: number;
  public urlId: string;
  public lastByteRangeEndOffset: number = 0;

  private _url: string;
  private _byteRange: number[];
  private _decryptdata: {
    uri: string,
    key: string,
  };
  private _elementaryStreams: {};

  constructor() {
    // Holds the types of data this fragment supports
    this._elementaryStreams = {
      [Fragment.ElementaryStreamTypes.AUDIO]: false,
      [Fragment.ElementaryStreamTypes.VIDEO]: false,
    };
  }

  /**
   * `type` property for this._elementaryStreams
   *
   * @enum
   */
  static get ElementaryStreamTypes() {
    return {
      AUDIO: 'audio',
      VIDEO: 'video',
    };
  }

  get url() {
    if (!this._url && this.relurl) {
      this._url = URLToolkit.buildAbsoluteURL(this.baseurl, this.relurl, { alwaysNormalize: true });
    }

    return this._url;
  }

  set url(value) {
    this._url = value;
  }

  get byteRange() {
    if (!this._byteRange && !this.rawByteRange) {
      return [];
    }

    if (this._byteRange) {
      return this._byteRange;
    }

    const byteRange = [];
    if (this.rawByteRange) {
      const params = this.rawByteRange.split('@', 2);
      if (params.length === 1) {
        const lastByteRangeEndOffset = this.lastByteRangeEndOffset;
        byteRange[0] = lastByteRangeEndOffset || 0;
      } else {
        byteRange[0] = parseInt(params[1], 10);
      }
      byteRange[1] = parseInt(params[0], 10) + byteRange[0];
      this._byteRange = byteRange;
    }
    return byteRange;
  }

  get byteRangeStartOffset() {
    return this.byteRange[0];
  }

  get byteRangeEndOffset() {
    return this.byteRange[1];
  }

  get decryptdata() {
    if (!this._decryptdata) {
      this._decryptdata = this.fragmentDecryptdataFromLevelkey(this.levelkey, this.sn);
    }

    return this._decryptdata;
  }

  get endProgramDateTime() {
    if (!Number.isFinite(this.programDateTime)) {
      return null;
    }

    const duration = !Number.isFinite(this.duration) ? 0 : this.duration;

    return this.programDateTime + (duration * 1000);
  }

  get encrypted() {
    return !!((this.decryptdata && this.decryptdata.uri !== null) && (this.decryptdata.key === null));
  }

  public addElementaryStream(type) {
    this._elementaryStreams[type] = true;
  }

  public hasElementaryStream(type) {
    return this._elementaryStreams[type] === true;
  }

  /**
   * Utility method for parseLevelPlaylist to create an initialization vector for a given segment
   * @returns {Uint8Array}
   */
  public createInitializationVector(segmentNumber) {
    const uint8View = new Uint8Array(16);

    for (let i = 12; i < 16; i++) {
      uint8View[i] = (segmentNumber >> 8 * (15 - i)) & 0xff;
    }

    return uint8View;
  }

  /**
   * Utility method for parseLevelPlaylist to get a fragment's decryption data from the currently parsed encryption key
   * data.
   * @param levelkey - a playlist's encryption info
   * @param segmentNumber - the fragment's segment number
   * @returns {*} - an object to be applied as a fragment's decryptdata
   */
  public fragmentDecryptdataFromLevelkey(levelkey, segmentNumber) {
    let decryptdata = levelkey;

    if (levelkey && levelkey.method && levelkey.uri && !levelkey.iv) {
      decryptdata = new LevelKey();
      decryptdata.method = levelkey.method;
      decryptdata.baseuri = levelkey.baseuri;
      decryptdata.reluri = levelkey.reluri;
      decryptdata.iv = this.createInitializationVector(segmentNumber);
    }

    return decryptdata;
  }
}
