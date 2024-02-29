const express = require('express');
const router = express.Router();
// const tokens = require('./controller');

// router.post("/create", tokens.createToken);
router.get("/ok", (req, res) => {
    return res.status(200).send("Yeah, I am ok");
})
module.exports = router;