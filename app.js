const express = require('express');
const path = require('path');
const MongoHelper = require('./mongo');
const auth = require('./auth');
const querystring = require('querystring');
const exec = require('child_process').exec;
const winston = require('winston');

const logger = winston.createLogger({
    level: "info",
    transports: [new winston.transports.File({ filename: './logs/app.log' })],
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    )
});

const app = express();

app.use((req, res, next) => {
    if (req.headers.origin && req.headers.origin.endsWith("liammahoney.dev")) {
        // only allowing requests from my website?
        res.header("Access-Control-Allow-Origin", req.headers.origin);
    }
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    if (req.method === "OPTIONS") {
        res.header("Access-Control-Allow-Methods", "PUT, POST, GET, PATCH, DELETE");
        res.status(200).json({});
    }
    next();
});

app.get("/", (req, res) => {
    res.end("welcome to my api");
});

app.get("/projects", (req, res) => {
    try {
        let mh = new MongoHelper();

        mh.getAllFromCollection("projects").then((results) => {
            logger.info(`[GET] /projects`, { ip: req.ip });
            res.status(200).end(JSON.stringify(results));
        }).catch((err) => {
            logger.error(`[GET] /projects`, { ip: req.ip, error: err.toString() });
            res.status(500).end(JSON.stringify(err));
        });
    } catch (err) {
        logger.error(`[GET] /projects`, { ip: req.ip, error: err.toString() });
        res.status(500).end(JSON.stringify(err));
    }
});

app.post("/project", (req, res) => {
    let data = "";

    req.on("data", (chunk) => {
        data += chunk;
    });

    req.on("error", (err) => {
        logger.error(`[POST] /project`, { error: err.toString(), ip: req.ip });
        res.status(500).send("issue with request");
    });

    req.on("end", () => {
        auth.authCheck(req.headers.authorization).then((result) => {
            let jdata = JSON.parse(data);
            let mh = new MongoHelper();

            mh.createProjectDocument(jdata).then((result) => {
                logger.info(`[POST] /project`, { ip: req.ip });
                res.status(200).send(result);
            }).catch((err) => {
                logger.error(`[POST] /project`, { error: err.toString(), ip: req.ip })
                res.status(err.status || 500).send(err);
            });
        }).catch((err) => {
            logger.warn(`[POST] /project unauthorized request`, { ip: req.ip });
            res.status(401).send("unauthorized request");
        });
    });
});

app.delete("/project", (req, res) => {
    let data = "";

    req.on("data", (chunk) => {
        data += chunk;
    });

    req.on("error", (err) => {
        logger.error(`[DELETE] /project`, { error: err.toString(), ip: req.ip });
        res.status(500).send("issue with request");
    });

    req.on("end", () => {
        auth.authCheck(req.headers.authorization).then((result) => {
            let jdata = JSON.parse(data); // ObjectID passed in from request
            let mh = new MongoHelper();

            mh.deleteProjectDocument(jdata).then((result) => {
                logger.info(`[DELETE] /project`, { ip: req.ip });
                res.status(200).send(result);
            }).catch((err) => {
                logger.error(`[DELETE] /project`, { error: err.toString(), ip: req.ip });
                res.status(err.status || 500).send(err);
            });
        }).catch((err) => {
            logger.warn(`[DELETE] /project unauthorized request`, { ip: req.ip });
            res.status(401).send("unauthorized request");
        });
    });
});

// complete update
app.put("/project", (req, res) => {
    let data = "";

    req.on("data", (chunk) => {
        data += chunk;
    });

    req.on("error", (err) => {
        logger.error(`[PUT] /project`, { error: err.toString(), ip: req.ip });
        res.status(500).send("issue with request");
    });

    req.on("end", () => {
        auth.authCheck(req.headers.authorization).then((result) => {
            let jdata = JSON.parse(data);
            let mh = new MongoHelper();

            mh.updateProjectDocument(jdata).then((result) => {
                logger.info(`[PUT] /project`, { ip: req.ip });
                res.status(200).send(result);
            }).catch((err) => {
                logger.error(`[PUT] /project`, { error: err.toString(), ip: req.ip });
                res.status(err.status || 500).send(err);
            });
        }).catch((err) => {
            logger.warn(`[PUT] /project unauthorized request`, { ip: req.ip });
            res.status(401).send("unauthorized request");
        });
    });
});

app.get("/admin*", (req, res) => {
    if (!req.query.token) {
        /* 
            had to move this out here (I think..), otherwise the request for 
            /admin/admin.js from the HTML page would redirect to authentication 
            which would cause the response to be /admin/admin.html (becuase 
            sucessful auth redirects to that page). 
        */
        if (req.path.endsWith("/admin/admin.js")) {
            res.sendFile(path.join(__dirname + '/admin/admin.js'));
        } else {
            logger.warn(`[GET] ${req.url}`, { ip: req.ip });
            res.redirect(301, '/authentication');
        }
    } else {
        auth.authCheck(req.query.token).then((result) => {
            if (req.path.endsWith("/admin/admin.html")) {
                logger.info(`[GET] /admin`, { ip: req.ip });
                res.sendFile(path.join(__dirname + '/admin/admin.html'));
            } else {
                logger.warn(`[GET] ${req.url}`, { ip: req.ip });
                res.sendFile(path.join(__dirname + '/public/404.html'));
            }
        }).catch((err) => {
            logger.error(`[GET] ${req.url}`, { error: err.toString(), ip: req.ip });
            res.redirect(301, '/unauthorized');
        });
    }
});

app.post("/contact", (req, res) => {
    let data = "";

    req.on('data', (chunk) => {
        data += chunk;
    });

    req.on('error', (err) => {
        logger.error(`[POST] ${req.url}`, { error: err.toString(), ip: req.ip });
        res.status(500).send("issue with request");
    });

    req.on('end', () => {
        let parsedData = JSON.parse(data);
        exec(`echo "${parsedData.body}\nReceived from: ${parsedData.email}" | mail -s "${parsedData.subject}" root`, (err, stdout, stderr) => {
            if (err) {
                logger.error(`[POST] ${req.url}`, { ip: req.ip, error: err.toString() });
                res.status(500).send(err);
            } else {
                logger.info(`[POST] ${req.url}`, { ip: req.ip });
                res.end();
            }
        });
    });
});

// initial authentication
app.get("/authentication", (req, res) => {
    res.redirect(301, `https://github.com/login/oauth/authorize?client_id=${process.env.GIT_CLIENT_ID}&allow_signup=false`);
});

// github authentication callback
app.get("/authenticated", (req, res) => {
    auth.initialAuth(req.query.code).then((result) => {
        let query = querystring.stringify({ "token": result })
        res.redirect(301, `https://admin.liammahoney.dev?${query}`);
    }).catch((err) => {
        logger.error(`[GET] ${req.url}`, { ip: req.ip, error: err.toString() });
        res.redirect(301, "/unauthorized");
    });
});

app.get("/unauthorized", (req, res) => {
    logger.info(`[GET] /unauthorized`, { ip: req.ip });
    res.sendFile(path.join(`${__dirname}/public/401.html`));
});

app.get("/authCheck*", (req, res) => {
    if (!req.query.token) {
        logger.warn(`[GET] /authCheck - no token passed in`, { ip: req.ip });
        res.status(401);
        res.end("auth failed");
    } else {
        auth.authCheck(req.query.token).then((result) => {
            logger.info(`[GET] /authCheck`, { ip: req.ip });
            res.end("OK");
        }).catch((err) => {
            logger.warn(`[GET] /authCheck`, { ip: req.ip, token: req.query.token });
            res.status(401);
            res.end("auth failed");
        });
    }
});

app.get("*", (req, res) => {
    logger.warn(`[GET] ${req.url}`, { ip: req.ip });
    res.end("your request is no good here homie");
});

app.post("*", (req, res) => {
    logger.warn(`[POST] ${req.url}`, { ip: req.ip });
    res.status(404);
    res.end("your request is no good here homie");
});

app.put("*", (req, res) => {
    logger.warn(`[PUT] ${req.url}`, { ip: req.ip });
    res.status(404);
    res.end("your request is no good here homie");
});

app.patch("*", (req, res) => {
    logger.warn(`[PATCH] ${req.url}`, { ip: req.ip });
    res.status(404);
    res.end("your request is no good here homie");
});

app.delete("*", (req, res) => {
    logger.warn(`[DELETE] ${req.url}`, { ip: req.ip });
    res.status(404);
    res.end("your request is no good here homie");
});

app.listen(8000);
console.log("api listening on 8000");
