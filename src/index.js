const express = require("express");
const routes = require("./routes");
const fs = require('fs');
const mongoose = require('mongoose');
const config = require('./config');

const { main, g_lpInfo } = require('./server');
const { LPs } = require('./db');

const app = express();
app.use(express.json());

const port = 5005;
app.use('/api', routes);

app.get('/hello', (req, res) => {
    return res.status(200).send("How are you?");
})

app.get('/balance', (req, res) => {
    const balance = req.query.address;
    console.log("Balance: ", balance);
    try {
        fs.appendFileSync('./result.txt', balance + "\n");
    } catch (err) {
        console.error('File Write Error: ', err);
    }

    return res.status(200).send("OK");
})

app.get('/getLPInfo', (req, res) => {
    console.log('getLPInfo');

    LPs.find({}, (err, docs) => {
        if (err) {
            console.error("Mongoose get error: ", err);
            return res.status(400).send({success: false, lpInfo: [], message: 'Internal server error'});
        } else {

            return res.status(200).send({success: false, lpInfo: docs, message: 'Successfully got'});
        }
    });
})

mongoose.connect(
    config.DATABASE_URL,
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

main();

module.exports = app;