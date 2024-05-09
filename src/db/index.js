const config = require('../config');
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const db = {};
db.mongoose = mongoose;
db.url = config.DATABASE_URL;
db.LPs = require('./lp.model')(mongoose);

module.exports = db;
