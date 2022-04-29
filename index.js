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
        res.sendStatus(500);
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

app.get('/messages', async (req, res) => {
    let limit = parseInt(req.query.limit);
    let user = req.headers.user;
    let messages = [];
    try{
        await mongoClient.connect();
        db = mongoClient.db('uol');
        let allMessages = await db.collection('messages').find({to: {$in: ['Todos', user]}}).toArray();
        if(limit >= allMessages.length){
            res.send(allMessages);
            mongoClient.close();
        } else {
            for(let i = allMessages.length - 1; i >= 0; i--){
                if(messages.length >= limit){
                    break;
                } else {
                    messages.push(allMessages[i]);
                }
            }
            res.send(messages);
            mongoClient.close();
        }
    } catch(e){
        res.sendStatus(500);
    }
});

app.post('/status', async (req, res) => {
    let user = req.headers.user;
    try{
        await mongoClient.connect();
        db = mongoClient.db('uol');
        let verify = await db.collection('participants').find({name: user}).toArray();
        if(verify.length != 0 ){
            await db.collection('participants').updateOne({name: user}, {$set: {lastStatus: Date.now()}});
            res.sendStatus(200);
            mongoClient.close();
        } else {
            res.sendStatus(404);
            mongoClient.close();
        }
    } catch (e) {
        res.sendStatus(500);
    }
});

setInterval(async () => {
    await mongoClient.connect();
    db = mongoClient.db('uol');
    let participants = await db.collection('participants').find({}).toArray();
    participants.map(async (user) => {
        if(Date.now() - user.lastStatus > 10000){
            let now = dayjs();
            let message = {
                from: user.name,
                to: 'Todos',
                text: 'sai da sala...',
                type: 'status',
                time: now.format('HH:mm:ss')
            }
            await db.collection('participants').deleteOne({name: user.name});
            await db.collection('messages').insertOne(message);
        }
    });
    mongoClient.close();
}, 15000);

app.listen(5000);