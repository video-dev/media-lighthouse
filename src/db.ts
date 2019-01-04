import { Collection, Db, MongoClient } from 'mongodb';
import { Playlist } from './analyze';
import Fragment from './hls/fragment';

export enum ProcessingStatus {
    Unprocessed = 0,
    Partial,
    Done,
}

export default class Database {
    private url: string = 'mongodb://localhost:27017';
    private dbName: string = 'media-lighthouse';
    private collectionName: string = 'streams';
    private db: Db;
    private collection: Collection;

    public async connect() {
        const { collectionName, dbName, url } = this;
        const client = await MongoClient.connect(url, { useNewUrlParser: true });
        console.log(`Connected to Mongo instance an ${url}`);
        const db = this.db = client.db(dbName);

        const collections = await db.collections();
        const collection = this.collection = collections.find((c) => c.collectionName === collectionName);
        if (!collection) {
            this.collection = await db.createCollection(collectionName);
            console.log(`${collectionName} collection created`);
        } else {
            console.log(`collection ${collectionName} already exists`);
        }
    }

    public async createPlaylistEntry(playlist: Playlist) {
        const { collection } = this;

        if (await collection.findOne({ url: playlist.url})) {
            console.log(`${playlist.url} document already exists`);
            return;
        }
        await collection.insertOne(playlist);
        console.log('wrote playlist to collection');
    }

    public async insertFrag(playlist, frag: Fragment, fragData) {
        console.log(`levels.${frag.level}.fragments.${frag.sn}.data`);
        return this.collection.findOneAndUpdate(
            { url: playlist.url },
            { $set: {[`levels.${frag.level}.fragments.${frag.sn}.data`]: fragData }},
            { upsert: true },
            ((error, result) => {
                console.log(error, result);
            }),
        );
    }

    public async getPlaylist(url: string) {
        return this.collection.findOne({ url });
    }
}
