const { timeStamp } = require("console");

module.exports = (mongoose) => {
    const LPs = mongoose.model(
        'LPs',
        mongoose.Schema({
            poolAddress: {
                type: String,
                default: ''
            },
            primaryAddress: {
                type: String,
                default: ''
            },
            primaryAmount: {
                type: String,
                default: ''
            },
            primaryIndex: {
                type: Number,
                default: 0
            },
            secondaryAddress: {
                type: String,
                default: ''
            },
            secondaryAmount: {
                type: String,
                default: ''
            },
            routerAddress: {
                type: String,
                default: ''
            },
            version: {
                type: String,
                default: ''
            },
            primarySymbol: {
                type: String,
                default: ''
            },
            secondarySymbol: {
                type: String,
                default: ''
            },
        },
        { timestamps: true }
    )
    );

    return LPs;
}