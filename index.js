const path = require("path");
const express = require("express");
const dotenv = require("dotenv");
// const logger = require("./middleware/logger");
const morgan = require("morgan");
const fileupload = require("express-fileupload");
const errorHandler = require("./middleware/error");
const connectDB = require("./config/db");

// Load env vars
dotenv.config({ path: "./config/config.env" });

// Connect to DB
connectDB();

// Route files
const bootcamps = require("./routes/bootcamps");
const courses = require("./routes/courses");

const app = express();

// Body parser
app.use(express.json());

// Dev logging
if (process.env.NODE_ENV === "development") {
    app.use(morgan("dev"));
}

// File uploading
app.use(fileupload());

// Set static folder
app.use(express.static(path.join(__dirname, "public")));

// Mount routers
app.use("/api/v1/bootcamps", bootcamps);
app.use("/api/v1/courses", courses);

// Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
    console.log(
        `Server running in ${process.env.NODE_ENV} mode at port: ${PORT}`
    );
});

process.on("unhandledRejection", (err, promise) => {
    console.log(`Error: ${err.message}`);
    server.close(() => process.exit(1));
});
