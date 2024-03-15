const express = require("express");
const routes = require("./routes");
const fs = require('fs');
const app = express();
app.use(express.json());

const port = 5005;
app.use('/api', routes);

app.listen(port, () => {
    console.log(`Server is running in PORT ${port}`);
})

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