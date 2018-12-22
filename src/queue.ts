import * as RedisSMQ from 'rsmq';

export default class Queue {
    private rsmq: RedisSMQ;
    private mediaQueue;
    public init(): void {
        const rsmq = this.rsmq = new RedisSMQ( { host: '127.0.0.1', port: 6379, ns: 'rsmq' } );
        console.log('creating mediaQueue');
        this.mediaQueue = rsmq.createQueue({ qname: 'mediaQueue'}, (err, resp) => {
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
}
