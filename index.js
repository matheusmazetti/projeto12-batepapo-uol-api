import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

let db = null;
const mongoClient = new MongoClient(process.env.MONGO_URI);

app.post('/participants', async (req, res) => {
    let body = req.body;
    let obj = {
        name: body.name,
        lastStatus: Date.now()
    };
    try{
        await mongoClient.connect();
        db = mongoClient.db('uol');
        await db.collection('participants').insertOne(obj);
        res.sendStatus(201);
        mongoClient.close();
    } catch(e) {
        res.sendStatus(500);
    }
});

app.get('/participants', async (req, res) => {
    try{
        await mongoClient.connect();
        db = mongoClient.db('uol');
        const participants = await db.collection('participants').find().toArray();
        res.send(participants);
        mongoClient.close();
    } catch(e){
        res.sendStatus(404);
    }
});

app.listen(5000);