import * as express from 'express';
import analyze from './analyze';

const port = 3000;
const app = express();

app.get('/analyze', async (req, res) => {
    const packets = await analyze('https://playertest.longtailvideo.com/adaptive/bipbop/discontinuity.m3u8');
    console.log(packets);
    res.header('Access-Control-Allow-Origin', '*');
    res.send(packets);
});

app.listen(port, () => console.log(`Listening on port ${port}`));
