import { get } from 'request-promise-native';
import * as Thumbcoil from 'thumbcoil';
import Fragment from './hls/fragment';
import M3U8Parser from './hls/m3u8-parser';

function isLevelPlaylist(playlist: string) {
    return playlist.indexOf('#EXTINF:') > 0 || playlist.indexOf('#EXT-X-TARGETDURATION:') > 0;
}

const batchDownload = async (frags: Fragment[]) => {
    const maxBatchSize = 50;
    let i = 0;
    while (i < frags.length) {
        const batchSize = Math.min(maxBatchSize, frags.length - i);
        await Promise.all(frags.slice(i, i + batchSize).map(async (frag) => {
            const data = await get({ url: frag.url, encoding: null });
            frag.data = Thumbcoil.tsInspector.inspect(data);
            return Promise.resolve();
        }));
        i += batchSize;
    }
    return Promise.resolve;
};

const filterPackets = (frag: Fragment) => {
    const audio = { pts: [], dts: [] };
    const video = { pts: [], dts: [] };
    frag.data.esMap.forEach((packet) => {
        if (packet.type === 'audio') {
            audio.pts.push(packet.pts);
            audio.dts.push(packet.dts);
        } else if (packet.type === 'video') {
            video.pts.push(packet.pts);
            video.dts.push(packet.dts);
        }
    });

    return { audio, video };
};

function collapseRanges(data) {
    const result = [];
    let i = 0;
    let j = 1;
    let equalSigns = false;

    while (i < data.length) {
        const sign = Math.sign(data[j] - data[i]);
        do {
            j++;
            equalSigns = Math.sign(data[j] - data[j - 1]) === sign;
        } while (j < data.length && equalSigns);

        if (j === data.length - 1) {
            if (equalSigns) {
                result.push([data[i], data[j]]);
            } else {
                result.push([data[i], data[j - 1]], [data[j]]);
            }
            break;
        } else {
            result.push([data[i], data[j - 1]]);
            i = j;
            j++;
        }
    }

    return result;
}

export default async function analyze(url: string) {
    const masterResponse = await get(url);
    let levels;
    if (isLevelPlaylist(masterResponse)) {
        levels = [M3U8Parser.parseLevelPlaylist(masterResponse, url, 0, 'main', 0)];
    } else {
        const parsedMaster = M3U8Parser.parseMasterPlaylist(masterResponse, url);
        levels = await Promise.all(parsedMaster.map(async (level, index) => {
            const levelString = await get(level.url);
            return M3U8Parser.parseLevelPlaylist(levelString, level.url, index, 'main', 0);
        }));
    }

    for (let i = 0; i < levels.length; i++) {
        console.log(`Downloading fragments for level ${i}`);
        const level = levels[i];
        await batchDownload(level.fragments);
    }

    const formattedLevels = levels.map((level) => {
        return level.fragments.map((frag) => {
            const { audio, video } = filterPackets(frag);
            return {
                audio: {
                    pts: collapseRanges(audio.pts),
                    dts: collapseRanges(audio.dts),
                },
                video: {
                    pts: collapseRanges(video.pts),
                    dts: collapseRanges(video.dts),
                },
            };
        });
    });

    return formattedLevels;
};

// (async () => {
//     const frags = await analyze('https://playertest.longtailvideo.com/adaptive/bbbfull/bbbfull.m3u8');
//     console.log(frags[0]);
// })();
