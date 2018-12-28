import * as express from 'express';
import * as RedisSMQ from 'rsmq';
import { analyze, parsePlaylist } from './analyze';
import Database from './db';
import MediaQueue from './queue';

const port = 3000;
const app = express();
const rsmq = this.rsmq = new RedisSMQ( { host: '127.0.0.1', port: 6379, ns: 'rsmq' } );
const db = new Database();

async function processFrags(queue, playlist) {
    while (true) {
        const frag = await queue.getFragment();
        if (!frag) {
            break;
        }
        const fragData = await analyze(frag);
        db.insertFrag(playlist, frag, fragData);
    }
}

async function processMedia(url: string) {
    const queue = new MediaQueue(rsmq, url);
    await queue.init();

    const playlist = await parsePlaylist(url);
    if (await queue.hasFragmentsEnqueued()) {
        await processFrags(queue, playlist);
    } else {
        await db.createPlaylistEntry(playlist);
        await Promise.all(playlist.levels.map(async (level) => {
            return await queue.pushFragments(level.fragments);
        }));
        await processFrags(queue, playlist);
    }
}

(async () => {
    await db.connect();

    app.get('/report', async (req, res) => {
        let url = req.query.stream;
        if (!url) {
            console.log('Stream param not provided');
            res.send(404);
            return;
        }
        url = decodeURIComponent(url);
        const playlist = await db.getPlaylist(url);
        res.header('Access-Control-Allow-Origin', '*');
        res.status(200);
        res.send(JSON.stringify(playlist));
    });

    app.post('/analyze', async (req, res) => {
        let url = req.query.stream;
        if (!url) {
            console.log('Stream param not provided');
            res.send(200);
            return;
        }
        url = decodeURIComponent(url);
        res.send(200);
        await processMedia(url);
        console.log('done');
    });

    app.listen(port, () => console.log(`Listening on port ${port}`));
})();

// (async (url) => {
// })('https://playertest.longtailvideo.com/adaptive/bbbfull/bbbfull.m3u8');
