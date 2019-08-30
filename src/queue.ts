import * as RedisSMQ from 'rsmq';
import Fragment from './hls/fragment';

function hash(s) {
    let h;
    for (let i = 0; i < s.length; i++) {
        h = Math.imul(31, h) + s.charCodeAt(i) | 0;
    }

    return h;
}

export default class MediaQueue {
    private rsmq: RedisSMQ;
    private qname: string;

    constructor(rsmq: RedisSMQ, playlistUrl: string) {
        this.rsmq = rsmq;
        this.qname = hash(playlistUrl);
    }

    public init() {
        const { rsmq, qname } = this;
        console.log(`creating queue for ${qname}`);
        rsmq.createQueue({ qname }, (err, resp) => {
            if (resp === 1) {
                console.log('mediaQueue created');
            } else if (err) {
                if (err.name === 'queueExists') {
                    console.log('mediaQueue already exists');
                } else {
                    console.log(err);
                }
            }
        });
    }

    public async hasFragmentsEnqueued(): Promise<boolean> {
        const { rsmq, qname } = this;
        return new Promise((resolve, reject) => {
            rsmq.getQueueAttributes({ qname }, (err, resp) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(!!resp.msgs);
                }
            });
        });
    }

    public async pushFragment(frag: Fragment) {
        const { rsmq, qname } = this;
        return new Promise((resolve, reject) => {
            rsmq.sendMessage({ qname, message: JSON.stringify(frag) }, (err, resp) => {
                if (resp) {
                    console.log(`Successfully enqueued ${frag.url}`);
                    resolve();
                } else {
                    console.log(`Failed to enqueue ${frag.url}`, err);
                    reject(err);
                }
            });
        });
    }

    public async pushFragments(fragments: Fragment[]) {
        return new Promise((resolve, reject) => {
            for (const frag of fragments) {
                try {
                    this.pushFragment(frag);
                } catch (e) {
                    reject(new Error(`Failed to enqueue frag ${e}`));
                }
            }
            resolve();
        });
    }

    public async getFragment(): Promise<Fragment | null> {
        const { rsmq, qname } = this;
        return new Promise((resolve, reject) => {
            rsmq.popMessage({ qname }, (err, resp) => {
                const msg = resp as any;
                if (msg.id) {
                    resolve(Object.assign(new Fragment(), JSON.parse(msg.message)));
                } else {
                    resolve(null);
                }
            });
        });
    }
}
