const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const bodyParser = require("body-parser");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const menuRoutes = require("./routes/menuRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const errorHandler = require("./middlewares/errorMiddlewares");
const paymentControllers=require("./controllers/paymentControllers")
const otpRoutes=require("./routes/otpRoutes")
dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json());
app.use(errorHandler);

// app.post(
//   "/api/payments/webhook",
//   express.raw({ type: "application/json" }),
//   paymentControllers.stripeWebhook
// );

// Routes
app.use("/api", authRoutes);
app.use("/api/menu", menuRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/otp", otpRoutes);

app.get("/", (req, res) => res.send("Breakfast Booking API Running"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
