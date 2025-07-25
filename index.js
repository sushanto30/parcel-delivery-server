// index.js (CommonJS style)
const express = require('express');
const cors = require('cors');
const Stripe = require('stripe')
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = Stripe(process.env.STRIPE_KEY)

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());





const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.x6avi3n.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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

    const db = client.db("sellToCustomer");
    const parcelCollection = db.collection("Parcels");
    const paymentsCollection = db.collection('payments')

    app.post('/addParcels', async (req, res) => {
      const parcelData = req.body
      const result = await parcelCollection.insertOne(parcelData)
      res.send(result)
    })


    app.get('/parcels', async (req, res) => {
      const userEmail = req.query.email
      const query = userEmail ? { created_by: userEmail } : {}

      const option = {
        sort: { createdAt: -1 }
      }
      const result = await parcelCollection.find(query, option).toArray()
      res.send(result)
    })

    app.get('/parcels/:id', async (req, res) => {
      const { id } = req.params;


      try {
        const parcel = await parcelCollection.findOne({ _id: new ObjectId(id) });

        res.send(parcel);
      } catch (err) {
        res.status(500).send({ message: 'Server error', error: err.message });
      }
    });


    app.delete('parcels/:id', async (req, res) => {
      const id = req.params.id;

      try {
        const result = await parcelCollection.deleteOne({ _id: new ObjectId(id) });

        res.send(result)
      } catch (error) {
        res.status(500).send({ success: false, message: 'Internal Server Error', error: error.message });
      }
    });

    app.post('/create-payment-intent', async (req, res) => {

      const amount = req.body.amount

      try {
        const paymentIn = await stripe.paymentIntents.create({
          amount: amount * 100, // e.g. 100 = 1.00 USD
          currency: 'usd',
          payment_method_types: ['card'],
        })
        res.send(paymentIn)
      }
      catch (err) {
        res.status(500).send({ error: err.message });
      }

    })

    app.post('/payments', async (req, res) => {

      const paymentData = req.body;

      const paymentResult = await paymentsCollection.insertOne(paymentData)

      const query = { _id: new ObjectId(paymentData.parcelId) }

      await parcelCollection.updateOne(query, { $set: { payment_status: "paid" } })

      res.send(paymentResult)


    })

    app.get('/payments', async (req, res) => {
      try {
        const email = req.query.email;

        if (!email) {
          return res.status(400).json({ error: 'Email is required' });
        }

        const query = { email };
        const options = {
          sort: { date: -1 } // সর্বশেষ পেমেন্ট আগে দেখাবে
        };

        const payments = await paymentsCollection.find(query, options).toArray();

        // res.status(200).json(payments);
        res.send(payments)
      } catch (error) {
        console.error('Error fetching payments:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });






    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


// Routes
app.get('/', (req, res) => {
  res.send('Sell to Customer Server is Running!');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
