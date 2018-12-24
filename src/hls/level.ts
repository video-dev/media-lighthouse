import Fragment from './fragment';

export default class Level {
    public endSN: number = 0;
    public endCC: number = 0;
    public fragments: Fragment[] = [];
    public initSegment: Fragment;
    public live: boolean;
    public needSidxRanges: boolean;
    public startCC: number = 0;
    public startSN: number = 0;
    public startTimeOffset: number;
    public targetduration: number = 0;
    public totalduration: number = 0;
    public type: string;
    public url: string;
    public version: number;
    public averagetargetduration: number;

    constructor(baseUrl) {
    this.url = baseUrl;
  }

  get hasProgramDateTime() {
    return !!(this.fragments[0] && Number.isFinite(this.fragments[0].programDateTime));
  }
}
