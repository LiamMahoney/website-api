let MongoClient = require('mongodb').MongoClient;
let mongo = require("mongodb");

/**
 * Contains all of the necessary functionality for CRUD operations for 
 * the projects of the website. 
 */
module.exports = class MongoHelper {
    constructor() {
        this.dbURL = process.env.MONGO_URL;
        this.dbName = process.env.MONGO_DB;
    }

    /**
     * Gets all of the entries from a particular collection from MongoDB 
     * and returns them in ascending order by title.
     * @param {string} colName: the collection to retrieve documents from
     * @returns {Promise}: rejects on any erros, otherwise resolves an array of all documents in the collection.
     */
    getAllFromCollection(colName) {
        return new Promise((resolve, reject) => {
            // old URL Parser is depricated
            let client = new MongoClient(this.dbURL, { useNewUrlParser: true });

            client.connect().then((res) => {
                let db = client.db(this.dbName);
                let collection = db.collection(colName);

                return collection.find().sort({ title: 1 }).toArray();
            }).then((results) => {
                resolve(results);
            }).catch((err) => {
                reject(err);
            }).finally(() => {
                client.close();
            });
        });
    }

    /**
     * Updates a document in the database to reflect the document (json object) given. 
     * @param {Object} data a representation of a mongo document stored in the db
     * structure:
     * {
     *   "_id": <id of document>,
     *   "title": <project title>,
     *   "link": <link to project>,
     *   "repo": <github repository link>,
     *   "description": <long text description>,
     *   "technologies": [<array of technologies used in project>]
     * }
     * @returns {Promise}: resolves if the update was done successfully, rejects on error or if no update done
     */
    updateProjectDocument(data) {
        return new Promise((resolve, reject) => {
            this.checkProjectParams(data).then(() => {
                // old URL parser is depricated
                let client = new MongoClient(this.dbURL, { useNewUrlParser: true });

                // connecting to the database
                client.connect().then(() => {
                    let db = client.db(this.dbName);
                    let colName = "projects";
                    let collection = db.collection(colName);

                    let id = new mongo.ObjectID(data._id)
                    // updating all fields of a document
                    return collection.updateOne({ "_id": id }, {
                        $set: {
                            "title": data.title,
                            "link": data.link,
                            "repo": data.repo,
                            "description": data.description,
                            "technologies": data.technologies
                        }
                    });
                }).then((results) => {
                    if (results.modifiedCount == 1) resolve(`modified: ${results.modifiedCount}`);
                    else reject(`matched: ${results.matchedCount} updated: ${results.modifiedCount}`);
                }).catch((err) => {
                    reject(err);
                }).finally(() => {
                    client.close();
                });
            }).catch((err) => {
                reject(err);
            });
        });
    }

    /**
     * Creates a new document in the project collection. 
     * @param {Object} data a representation of a mongo document stored in the db
     * structure:
     * {
     *   "_id": <id of document>,
     *   "title": <project title>,
     *   "link": <link to project>,
     *   "repo": <github repository link>,
     *   "description": <long text description>,
     *   "technologies": [<array of technologies used in project>]
     * }
     * @returns {Promise} resolves if insert into db was successful, rejects
     * otherwise
     */
    createProjectDocument(data) {
        return new Promise((resolve, reject) => {
            this.checkNewProjectParams(data).then((result) => {
                // old URL parser is depricated
                let client = new MongoClient(this.dbURL, { useNewUrlParser: true });

                client.connect().then(() => {

                    let db = client.db(this.dbName);
                    let colName = "projects";
                    let collection = db.collection(colName);

                    // updating all fields of a document
                    return collection.insertOne(
                        {
                            "title": data.title,
                            "link": data.link,
                            "repo": data.repo,
                            "description": data.description,
                            "technologies": data.technologies
                        }
                    )
                }).then((results) => {
                    if (results.insertedCount == 1) resolve(JSON.stringify({
                        "inserted": `inserted: ${results.insertedCount}`,
                        "_id": results.insertedId.toString()
                    }));
                    else reject(`inserted: ${results.insertedCount}`);
                }).catch((err) => {
                    reject(err);
                }).finally(() => {
                    client.close();
                });
            }).catch((err) => {
                reject(err);
            });
        });
    }

    /**
     * Removes the collection from the database.
     * @param {String} data mongo collection ID as a string (just the value, not ObjectID(...))
     * @returns {Promise} resolves if collection is removed, rejects otherwise. 
     */
    deleteProjectDocument(data) {
        return new Promise((resolve, reject) => {

            if (!data) reject("collection id not passed in");

            // old URL parser is depricated
            let client = new MongoClient(this.dbURL, { useNewUrlParser: true });

            // connecting to the database
            client.connect().then(() => {
                let db = client.db(this.dbName);
                let colName = "projects";
                let collection = db.collection(colName);

                let id = new mongo.ObjectID(data)
                // updating all fields of a document
                return collection.deleteOne({ "_id": id });
            }).then((results) => {
                if (results.deletedCount == 1) resolve(`deleted: ${results.deletedCount}`);
                else reject(`deleted: ${results.deletedCount}`);
            }).catch((err) => {
                reject(err);
            }).finally(() => {
                client.close();
            });
        });
    }

    /**
     * Makes sure all of the necessary fields are present.
     * @param {Object} data a JSON object that represents the document structure. See documentation for MongoHelper.updateCollection for structure.
     * @returns {Promise} resolves if all required fields are present, rejects otherwise.
     */
    checkProjectParams(data) {
        return new Promise((resolve, reject) => {
            let missing = [];
            if (data._id === undefined) missing.push("_id");
            if (data.title === undefined) missing.push("title");
            if (data.link === undefined) missing.push("link");
            if (data.description === undefined) missing.push("description");
            if (data.technologies === undefined) missing.push("technologies");
            if (!Array.isArray(data.technologies)) missing.push("technologies is not an array")

            // missing array has contents, some fields are missing
            if (missing.length > 0) reject(`Missing the following params: ${missing.toString()}`);

            resolve();
        });
    }

    /**
     * Makes sure all of the necessary fields are present besides the _id field.
     * @param {Object} data a JSON object that represents the document structure without the _id field. See documentation for MongoHelper.updateCollection for an example structure.
     * @returns {Promise} resolves if all required fields are present, rejects otherwise.
     */
    checkNewProjectParams(data) {
        return new Promise((resolve, reject) => {
            let missing = [];
            if (data.title === undefined) missing.push("title");
            if (data.link === undefined) missing.push("link");
            if (data.description === undefined) missing.push("description");
            if (data.technologies === undefined) missing.push("technologies");
            if (!Array.isArray(data.technologies)) missing.push("technologies is not an array")

            // missing array has contents, some fields are missing
            if (missing.length > 0) reject(`Missing the following params: ${missing.toString()}`);

            resolve();
        });
    }

}