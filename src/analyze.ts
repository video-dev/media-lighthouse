import { get } from 'request-promise-native';
import * as Thumbcoil from 'thumbcoil';
import Fragment from './hls/fragment';
import Level from './hls/level';
import M3U8Parser from './hls/m3u8-parser.js';

export interface Playlist {
    levels: Level[];
    url: string;
}

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

const filterPackets = (esMap) => {
    const audio = { pts: [], dts: [] };
    const video = { pts: [], dts: [] };
    esMap.forEach((packet) => {
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
            equalSigns = !sign || Math.sign(data[j] - data[j - 1]) === sign;
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

    return result.flat();
}

export async function analyze(frag: Fragment) {
    const fragUrl = frag.url;
    console.log(`analyzing frag ${fragUrl}`);
    const tsData = await get({ url: fragUrl, encoding: null });
    const thumbFrag = Thumbcoil.tsInspector.inspect(tsData);
    return collapseLevelTiming(thumbFrag.esMap);
}

export function collapseLevelTiming(esMap) {
    const { audio, video } = filterPackets(esMap);
    return {
        audio: {
            dts: collapseRanges(audio.dts),
            pts: collapseRanges(audio.pts),
        },
        video: {
            dts: collapseRanges(video.dts),
            pts: collapseRanges(video.pts),
        },
    };
}

export async function parsePlaylist(url: string): Promise<Playlist> {
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

    return {
        levels,
        url,
    };
}
