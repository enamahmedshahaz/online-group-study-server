const express = require('express');
const cors = require('cors');
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const port = process.env.PORT || 5000;

const app = express();

//middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.bmgmcoi.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const database = client.db("onlineGroupStudyDB");
        const assignmentCollection = database.collection("assignments");
        const submissionCollection = database.collection("submissions");


        //API to add a new assignment
        app.post("/assignments", async (req, res) => {
            const newItem = req.body;
            //console.log('New Assignment -> ', newItem);
            const result = await assignmentCollection.insertOne(newItem);
            res.send(result);
        });


        //API to get all Assignments
        app.get("/assignments", async (req, res) => {

            let query = {};
            if (req.query?.level) {
                query = { difficultyLevel: req.query.level }
            }

            const page = parseInt(req.query.page);
            const size = parseInt(req.query.size);

            const cursor = assignmentCollection.find(query)
            .skip(page * size)
            .limit(size);

            const result = await cursor.toArray();

            // const cursor = assignmentCollection.find();

            res.send(result);
        });

        //API to count assignment based on level filter
        app.get('/assignmentCount', async (req, res) => {
            let query = {};
            if (req.query?.level) {
                query = { difficultyLevel: req.query?.level};
            }
            const count = await assignmentCollection.countDocuments(query);
            res.send({ count });
          });

        //API to get a single Assignment based on _Id
        app.get("/assignments/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await assignmentCollection.findOne(query);
            res.send(result);
        });

        //API to delete a single Assignment based on _Id
        app.delete("/assignments/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await assignmentCollection.deleteOne(query);
            res.send(result);
        });


        //API to update a single Assignment based on _Id
        app.put("/assignments/:id", async (req, res) => {

            const id = req.params.id;
            const assignment = req.body;

            // Create a filter for the document with the id 
            const filter = { _id: new ObjectId(id) };

            /* Set the upsert option to insert a document 
            if no documents match the filter */

            /* if set to false : If no documents match the filter criteria,
             the method does not perform any update operation  */
            const options = { upsert: true };

            // Specify the updated values for the fields 
            const updatingAssignment = {
                $set: {
                    title: assignment.title,
                    difficultyLevel: assignment.difficultyLevel,
                    dueDate: assignment.dueDate,
                    thumbnail: assignment.thumbnail,
                    marks: assignment.marks,
                    description: assignment.description
                },
            };

            // Update the first document that matches the filter
            const result = await assignmentCollection.updateOne(filter, updatingAssignment, options);
            res.send(result);
        });

        //API to add a new assignment submission
        app.post("/submissions", async (req, res) => {
            const newSubmissionItem = req.body;
            //console.log('New submission -> ', newSubmissionItem);
            const result = await submissionCollection.insertOne(newSubmissionItem);
            res.send(result);
        });

        //API to view assignment submissions based on query (find items of other users )
        app.get("/submissions", async (req, res) => {

            let query = {};

            if (req.query?.email) {
                // only find assignments submitted by other users with pending status
                query = {
                    $and: [
                        { submitted_by: { $ne: req.query.email } },
                        { status: "pending" }
                    ]
                }
            }

            const result = await submissionCollection.find(query).toArray();

            res.send(result);
        });


        //API to view my assignment submissions (find items of only logged in users )
        app.get("/my-submissions", async (req, res) => {
            let query = {};
            if (req.query?.email) {
                // only find assignments submitted by logged in user
                query = { submitted_by:  req.query.email }
            }
            const result = await submissionCollection.find(query).toArray();
            res.send(result);
        });

        //api to update a assignment submission
        app.patch('/submissions/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedSubmission = req.body;

            const updateDoc = {
                $set: {
                    givenMark: updatedSubmission.givenMark,
                    feedback: updatedSubmission.feedback,
                    status: updatedSubmission.status
                },
            };

            const result = await submissionCollection.updateOne(filter, updateDoc);

            res.send(result);
        })


        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");

    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}

run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('::Online Group Study:: server is running')
});

app.listen(port, () => {
    console.log(`Online-Group-Study Server is running on port ${port}`)
});
