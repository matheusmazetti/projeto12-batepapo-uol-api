import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import Joi from 'joi';
import dayjs from 'dayjs';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

let db = null;
const mongoClient = new MongoClient(process.env.MONGO_URI);

let userSchema = Joi.object({
    name: Joi.string().min(1).required()
});

app.post('/participants', async (req, res) => {
    let body = req.body;
    let obj = {
        name: body.name,
        lastStatus: Date.now()
    };
    let now = dayjs();
    let status = {
        from: body.name,
        to: 'Todos',
        text: 'entra na sala...',
        type: 'status',
        time: now.format('HH:mm:ss')
    };
    let { error } = userSchema.validate(body);
    if(error === undefined){
        try{
            await mongoClient.connect();
            db = mongoClient.db('uol');
            let verify = await db.collection('participants').find({name: obj.name}).toArray();
            if(verify.length == 0){
                await db.collection('participants').insertOne(obj);
                await db.collection('messages').insertOne(status);
                res.sendStatus(201);
                mongoClient.close();
            } else {
                res.sendStatus(409);
                mongoClient.close();
            }
        } catch(e) {
            res.sendStatus(500);
        }
    } else {
        res.sendStatus(422);
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

let messageSchema = Joi.object({
    to: Joi.string().min(1).required(),
    text: Joi.string().min(1).required(),
    type: Joi.any().valid('private_message', 'message')
});

app.post('/messages', async (req, res) => {
    let body = req.body;
    let header = req.headers.user;
    let { error } = messageSchema.validate(body);
    let now = dayjs();
    let obj = {
        from: header,
        to: body.to,
        text: body.text,
        type: body.type,
        time: now.format('HH:mm:ss')
    };
    if(error == undefined && header != undefined){
        try{
            await mongoClient.connect();
            db = mongoClient.db('uol');
            let userVerify = await db.collection('participants').find({name: header}).toArray();
            if(userVerify.length != 0){
                await db.collection('messages').insertOne(obj);
                res.sendStatus(201);
                mongoClient.close();
            } else {
                res.sendStatus(422);
                mongoClient.close();
            }
            
        } catch(e) {
            res.sendStatus(500);
        }
    } else {
        res.sendStatus(422);
    }
});

app.listen(5000);