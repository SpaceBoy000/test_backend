const express = require("express");

const app = express();
app.use(express.json());

const port = 5001;

app.listen(port, () => {
    console.log(`Server is running in PORT ${port}`);
})

app.get('/hello', (req, res) => {
    return res.status(200).send("How are you?");
})

