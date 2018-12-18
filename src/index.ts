import { get } from 'request-promise-native';
import * as Thumbcoil from 'thumbcoil';
import Fragment from './hls/fragment';
import M3U8Parser from './hls/m3u8-parser';

function isLevelPlaylist(playlist: string) {
    return playlist.indexOf('#EXTINF:') > 0 || playlist.indexOf('#EXT-X-TARGETDURATION:') > 0;
}

const batchDownload = async (frags: Fragment[]) => {
    const maxBatchSize = 10;
    let i = 0;
    while (i < frags.length) {
        const batchSize = Math.min(maxBatchSize, frags.length - i);
        console.log(`downloading batch ${i},${i + batchSize} of ${frags.length}`);
        await Promise.all(frags.slice(i, i + batchSize).map(async (frag, index) => {
            console.log(`downloading frag ${i + index}`);
            frag.data = await get({ url: frag.url, encoding: null });
            console.log(`frag ${i + index} finished`);
            return Promise.resolve();
        }));
        i += batchSize;
    }
    return Promise.resolve;
};

(async (url) => {
    const masterResponse = await get(url);
    let parsedLevels;
    if (isLevelPlaylist(masterResponse)) {
        parsedLevels = [M3U8Parser.parseLevelPlaylist(masterResponse, url, 0, 'main', 0)];
    } else {
        const parsedMaster = M3U8Parser.parseMasterPlaylist(masterResponse, url);
        parsedLevels = await Promise.all(parsedMaster.map(async (level, index) => {
            const levelString = await get(level.url);
            return M3U8Parser.parseLevelPlaylist(levelString, level.url, index, 'main', 0);
        }));
    }

    for (let i = 0; i < parsedLevels.length; i++) {
        console.log(`Downloading fragments for level ${i}`);
        const level = parsedLevels[i];
        await batchDownload(level.fragments);
    }

    // console.log(Thumbcoil.tsInspector.inspect(parsedLevels[0].fragments[0].data));
})('https://playertest.longtailvideo.com/adaptive/bipbop/discontinuity.m3u8');
