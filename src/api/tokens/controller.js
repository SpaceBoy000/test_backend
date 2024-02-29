const formidable = require('formidable');
const fs = require('fs');
const { mintSPLToken } = require("./utils");

exports.createToken = (req, res) => {
    console.log("uploading file...");

    var form = new formidable.IncomingForm();

    form.parse(req, async function (err, fields, files) {
        if (err) {
            console.log("error: ", err);
            return res.status(400).send({ success: false, message: 'Uploading failed' });
        }

        console.log("fields: ", fields);
        console.log("files: ", files);
        console.log("Json data: ", JSON.parse(fields.metadata));

        const name = JSON.parse(fields.metadata).name;
        const symbol = JSON.parse(fields.metadata).symbol;
        const decimal = JSON.parse(fields.metadata).decimal;
        const totalSupply = JSON.parse(fields.metadata).totalSupply;
        const tokenKind = JSON.parse(fields.metadata).tokenKind;
        const wallet = JSON.parse(fields.metadata).wallet;
        const logoPath = files.file[0].filepath;
        const logoName = files.file[0].originalFilename;

        try {
            const mintKey = await mintSPLToken(name, symbol, decimal, totalSupply, tokenKind, wallet, logoPath, logoName);
            return res.status(200).send({ success: true, message: "Token create success", mintKey });
        } catch (err) {
            console.error("mintSPLToken Error: ", err);
        }
        return res.status(400).send({ success: false, message: "Token create failed" });
    })
}

