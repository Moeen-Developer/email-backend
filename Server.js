const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const userRoutes = require("./Routes/UserRoutes");
const EmailRoutes = require("./Routes/EmailRoutes");
const session = require('express-session');
const cors = require("cors");
const cron = require('node-cron');

const PORT = 3000;


const app = express();


// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(bodyParser.json());
let corsOptions = {
    origin: "*"
};
app.use(cors(corsOptions));
// Connect to MongoDB
mongoose
.connect('mongodb://127.0.0.1:27017/mails', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => {
    console.log("connected to Database");
})    
.catch((error) => {
    console.log(error);
})

//Routes
app.use("/api/users", userRoutes);
app.use("/", EmailRoutes);


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})