import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

let users = [];

app.post('/participants', (req, res) => {
    let body = req.body;
    let obj = {
        name: body.name
    }
    users.push(obj);
    res.sendStatus(201);
});

app.listen(5000);