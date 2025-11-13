const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const admin = require("firebase-admin");
dotenv.config();
const app = express();

const serviceAccount = require("./assignment10-firebase-adminsdk-.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Middleware
app.use(cors());
app.use(express.json());

// const verifyFirebaseToken = async (req, res, next) => {
//   if (!req.headers.authorization) {
//     return res.status(401).send({ message: "Unauthorized access" });
//   }
//   const token = req.headers.authorization.split(" ")[1];

//   if (!token) {
//     return res.status(401).send({ message: "Unauthorized access" });
//   }

//   // Verify the token using Firebase Admin SDK
//   try {
//     const uaerInfo = await admin.auth().verifyIdToken(token);
//     console.log("Decoded Token:", uaerInfo);
//     next();
//   } catch (error) {
//     res.status(401).send({ message: "Unauthorized access" });
//   }
// };

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    const db = client.db("LocalEats");
    const allreview = db.collection("all-review");
    const allfavorite = db.collection("allfavorite");
    //post review api
    app.post("/add-review", async (req, res) => {
      try {
        const newReview = req.body;
        const result = await allreview.insertOne(newReview);
        res.send(result);
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    });
    //post favorite api
    app.post("/all-favorite", async (req, res) => {
      try {
        const newFavorite = req.body;
        const result = await allfavorite.insertOne(newFavorite);
        res.send(result);
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    });

    // update by patch method
    app.patch("/all-review/:id", async (req, res) => {
      const id = req.params.id;
      const updatedReview = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: updatedReview,
      };
      const result = await allreview.updateOne(filter, updateDoc);
      res.send(result);
    });

    //delete review api
    app.delete("/all-review/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await allreview.deleteOne(query);
      res.send(result);
    });
    //get review api
    app.get("/all-review", async (req, res) => {
      try {
        const search = req.query.search || "";
        const query = search
          ? { foodName: { $regex: search, $options: "i" } }
          : {};

        const reviews = await allreview
          .find(query)
          .sort({ starRating: -1 })
          .toArray();

        res.json(reviews);
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    });

    //get all favorite api
    app.get("/all-favorite", async (req, res) => {
      try {
        const favorite = await allfavorite.find().toArray();
        res.json(favorite) || [];
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    });

    // get favorite by email
    app.get("/my-favorite", async (req, res) => {
      try {
        const userEmail = req.query.email;
        const query = { email: userEmail };
        const favorite = await allfavorite.find(query).toArray();
        res.send(favorite);
      } catch (error) {
        console.error("Error fetching favorite:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });
    // get review by email
    app.get("/my-review", async (req, res) => {
      try {
        const userEmail = req.query.email;
        const query = { email: userEmail };
        const review = await allreview.find(query).toArray();
        res.send(review);
      } catch (error) {
        console.error("Error fetching favorite:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });
    // first 6 review sort and limit
    app.get("/all-review/sort", async (req, res) => {
      try {
        const reviews = await allreview
          .find()
          .sort({ starRating: -1 })
          .limit(6)
          .toArray();
        res.json(reviews);
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    });
    // get review by email

    app.get("/user/reviews", verifyFirebaseToken, async (req, res) => {
      const userEmail = req.user.email;
      const reviews = await allreview.find({ email: userEmail }).toArray();
      res.json(reviews);
    });

    //get review by id api
    app.get("/all-review/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const review = await allreview.findOne(query);
      res.send(review);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1);
  }
}

run().catch(console.dir);

// Basic route
app.get("/", (req, res) => {
  res.json({ message: "Server is running!" });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`🔗 http://localhost:${PORT}`);
});

// Handle application shutdown
process.on("SIGINT", async () => {
  await client.close();
  process.exit(0);
});
