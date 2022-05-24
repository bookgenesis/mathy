const express = require("express");
const bodyParser = require("body-parser");
const crypto = require("crypto");
const mathjax = require("mathjax-node");
const JSON = require("JSON");

const port = 3000;
const api = express();

mathjax.config({
    MathJax: {
        SVG: { font: "STIX-Web" },
    },
});
mathjax.start();

api.use(bodyParser.json());
api.use(
    bodyParser.urlencoded({
        extended: true,
    })
);

api.get("/", (request, response) => {
    console.log(`URL: ${request.url}`);
    response.send('{"msg": "Hello, Server!"}');
});

api.post("/", (request, response) => {
    console.log(`URL: ${request.url}`);
    promises = request.body.map((item) => {
        var h = crypto.createHash("sha256");
        h.update(item.math);
        var b64digest = Buffer.from(h.digest("hex"), "utf-8")
            .toString("base64")
            .replace(/=+$/, "");
        return mathjax
            .typeset({
                math: item.math,
                format: item.format,
                svg: item.svg,
                mml: item.mml,
                speakText: true,
                linebreaks: false,
            })
            .then((result) => {
                result.b64digest = b64digest;
                return result;
            });
    });
    Promise.all(promises).then((results) => {
        response.send(results);
    });
});

const server = api.listen(port, (error) => {
    if (error) return console.log(`Error: ${error}`);

    console.log(`Server listening on port ${server.address().port}`);
});
