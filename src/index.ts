import * as express from 'express';
import analyze from './analyze';
import Queue from './queue';

const port = 3000;
const app = express();
const queue = new Queue();
queue.init();

app.get('/analyze', async (req, res) => {
    const packets = await analyze('https://playertest.longtailvideo.com/adaptive/bbbfull/bbbfull.m3u8');
    console.log(packets);
    res.header('Access-Control-Allow-Origin', '*');
    res.send(packets);
});

app.listen(port, () => console.log(`Listening on port ${port}`));
