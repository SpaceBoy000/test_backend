const express = require("express");
const router = express.Router();

const tokens = require("../api/tokens");

router.use('/tokens', tokens);
router.get("/ok", (req, res) => {
    return res.status(200).send("Yeah, I am ok");
})
module.exports = router;