require('dotenv').config();
const express = require("express");
const routes = require("./routes");
const fs = require('fs');
const mongoose = require('mongoose');
const config = require('./config');

const { main } = require('./server');
const { LPs } = require('./db');

const app = express();
app.use(express.json());

const port = process.env.PORT || 5005;

app.use('/api', routes);

app.get('/hello', (req, res) => {
    return res.status(200).send("How are you?");
})

app.get('/getLPInfo', (req, res) => {
    console.log('getLPInfo');

    LPs.find({}, (err, docs) => {
        if (err) {
            console.error("Mongoose get error: ", err);
            return res.status(400).send({success: false, lpInfo: [], message: 'Internal server error'});
        } else {
            
            return res.status(200).send({success: true, lpInfo: docs, message: 'Successfully got'});
        }
    });
})

const db_url = process.env.DATABASE_URL || config.DATABASE_URL;

mongoose.connect(
    db_url,
    {
        useNewUrlParser: true,
        useUnifiedTopology: true
    },
    (err) => {
        if (err) console.log('Database connect error: ', err)
        else console.log('MONGODB CONNECTED');
    }
)

app.listen(port, () => {
    console.log(`Server is running in PORT ${port}`);
})

// main();

module.exports = app;