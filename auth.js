let https = require("https");

/**
 * Swaps the temporary code for an access token which can be used
 * to auth requests to the GitHub API. Then checks whether the user
 * is permitted to have admin access by getting information about
 * their github profile and seeing if it matches the requried profile
 * ID (mine).
 * @param {String} code initial code returned from github oauth flow
 * @returns {Promise} resolves token as string, rejects error message
 */
function initialAuth(code) {
    return new Promise((resolve, reject) => {
        getAccessToken(code).then((result) => {
            return Promise.all([getUserInformation(result), result]);
        }).then((result) => {
            return Promise.all([validateUser(JSON.parse(result[0])), result[1]]);
        }).then((result) => {
            resolve(`${result[1]}`);
        }).catch((err) => {
            reject(err);
        });
    });
}

/**
 * Checks if the user associated with the given github oauth access token
 * is valid. Apparently tokens don't expire so don't need to check if the 
 * token is still valid.
 * @param {String} token Github oauth api access token 
 * @returns {Promise} resolves if user is valid, rejects if not
 */
function authCheck(token) {
    return new Promise((resolve, reject) => {
        getUserInformation(token).then((result) => {
            return validateUser(JSON.parse(result));
        }).then((result) => {
            resolve(result);
        }).catch((err) => {
            reject(err);
        });
    });
}

/**
 * Turns the code returned from the first step in the github oauth
 * flow into an api access token. 
 * @param {String} code initial code returned from github oauth flow
 * @returns {Promise} resolves api access token rejects error details 
 */
function getAccessToken(code) {
    return new Promise((resolve, reject) => {
        let body = {
            client_id: process.env.GIT_CLIENT_ID,
            client_secret: process.env.GIT_CLIENT_SECRET,
            code: code
        }

        let options = {
            hostname: "github.com",
            port: 443,
            path: "/login/oauth/access_token",
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
        }

        let req = https.request(options, (res) => {

            let reqResponse = "";
            res.on('data', (chunk) => {
                reqResponse += chunk;
            });

            res.on('end', () => {
                if (res.statusCode === 200) resolve(JSON.parse(reqResponse).access_token);
                reject(reqResponse);
            });

        });

        req.on('error', (err) => {
            reject(err);
        });

        req.end(JSON.stringify(body));
    });
}

/**
 * Gets public profile information about the authenticated user.
 * @param {String} token GitHub API access token 
 * @returns {Promise} resolves profile information rejects error information
 */
function getUserInformation(token) {
    return new Promise((resolve, reject) => {
        let options = {
            hostname: "api.github.com",
            port: 443,
            path: "/user",
            method: "GET",
            headers: {
                "Accept": "application/json",
                "Authorization": `token ${token}`,
                "User-Agent": "personal-site-auth"
            }
        }

        let req = https.request(options, (res) => {
            let reqResponse = "";

            res.on('data', (chunk) => {
                reqResponse += chunk;
            });

            res.on('end', () => {
                if (res.statusCode === 200) resolve(reqResponse);
                reject(reqResponse);
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        req.end();
    });
}

/**
 * Determines if the user should be granted access or not. Only 
 * users that match my github profile ID will be allowed. 
 * @param {Object} userInfo JSON response from GitHub API [GET] /user request 
 * @returns {Boolean} true if valid, false otherwise
 */
function validateUser(userInfo) {
    return new Promise((resolve, reject) => {
        let ID = process.env.GIT_PROFILE_ID;

        if (ID == userInfo.id) resolve(true);

        reject("User not allowed");
    });
}

module.exports = { initialAuth, authCheck }