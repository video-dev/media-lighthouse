import * as express from 'express';
import * as fs from 'fs';
import * as RedisSMQ from 'rsmq';
import { analyze, parsePlaylist } from './analyze';
import MediaQueue from './queue';

const port = 3000;
const app = express();
const rsmq = this.rsmq = new RedisSMQ( { host: '127.0.0.1', port: 6379, ns: 'rsmq' } );
writeStream.write('{ frags: [\n');

app.get('/analyze', async (req, res) => {
    const levels = await parsePlaylist('https://playertest.longtailvideo.com/adaptive/bbbfull/bbbfull.m3u8');
    console.log(levels);
    res.header('Access-Control-Allow-Origin', '*');
});

app.listen(port, () => console.log(`Listening on port ${port}`));

async function processFrags(queue, writeStream) {
    while (true) {
        const frag = await queue.getFragment();
        if (!frag) {
            break;
        }
        const fragData = await analyze(frag);
        writeStream.write(`${JSON.stringify(fragData)},\n`);
    }
}

(async (url) => {
    const writeStream = fs.createWriteStream(`${url}.json`);
    const queue = new MediaQueue(rsmq, url);
    await queue.init();
    const playlist = await parsePlaylist(url);
    const alreadyRequested = await queue.hasFragmentsEnqueued();
    if (alreadyRequested) {
        await processFrags(queue, writeStream);
    } else {
        await Promise.all(playlist.map(async (level) => {
            return await queue.pushFragments(level.fragments);
        }));
        await queue.pushFragments(playlist[0].fragments);
        await processFrags(queue, writeStream);
    }
    writeStream.write(']}');
    console.log('done');
})('https://playertest.longtailvideo.com/adaptive/bbbfull/bbbfull.m3u8');
