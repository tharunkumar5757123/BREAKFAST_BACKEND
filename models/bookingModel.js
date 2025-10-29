const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  date: { type: String, required: true }, // 'YYYY-MM-DD'
  time: { type: String, required: true }, // '08:00' or slot id
  guests: { type: Number, default: 1 },
  status: {
    type: String,
    enum: ["pending-payment", "booked", "cancelled", "completed"],
    default: "pending-payment",
  },
  meta: {
    cart: { type: Array, default: [] }, // store selected items
  },
  createdAt: { type: Date, default: Date.now },
});

bookingSchema.index({ date: 1, time: 1 });

module.exports = mongoose.model("Booking", bookingSchema);
