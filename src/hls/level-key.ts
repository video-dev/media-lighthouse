// @ts-nocheck
import * as URLToolkit from 'url-toolkit';

export default class LevelKey {
    public method: string = null;
    public key = null;
    public iv = null;
    public reluri: string = null;
    public baseuri: string = null;

    private _uri = null;

  get uri() {
    if (!this._uri && this.reluri) {
      this._uri = URLToolkit.buildAbsoluteURL(this.baseuri, this.reluri, { alwaysNormalize: true });
    }

    return this._uri;
  }
}
