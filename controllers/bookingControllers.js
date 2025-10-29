const Booking = require("../models/bookingModel");
const User = require("../models/authModel");
const nodemailer = require("nodemailer");

const SLOTS = ["08:00", "09:00", "10:00", "11:00"];
const CAPACITY_PER_SLOT = 5;

/**
 * 📅 Create a new booking (initial status: pending-payment)
 */
const createBooking = async (req, res) => {
  try {
    const { date, time, guests } = req.body;
    const userId = req.user._id;

    // 🚫 Prevent admin from booking
    if (req.user.role === "admin") {
      return res
        .status(403)
        .json({ message: "Admins cannot create bookings." });
    }

    // 🧩 Validate input
    if (!date || !time) {
      return res.status(400).json({ message: "Date and time are required" });
    }

    if (!SLOTS.includes(time)) {
      return res.status(400).json({ message: "Invalid time slot" });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res
        .status(400)
        .json({ message: "Invalid date format (use YYYY-MM-DD)" });
    }

    // 🔍 Check for duplicate active booking
    const existingBooking = await Booking.findOne({
      user: userId,
      date,
      time,
      status: { $in: ["booked", "pending-payment"] },
    });
    if (existingBooking) {
      return res
        .status(400)
        .json({ message: "You already have a booking for this slot." });
    }

    // 🔍 Check slot capacity
    const count = await Booking.countDocuments({
      date,
      time,
      status: { $in: ["booked", "pending-payment"] },
    });
    if (count >= CAPACITY_PER_SLOT) {
      return res.status(409).json({ message: "Slot fully booked" });
    }

    // ✅ Create new booking
    const booking = await Booking.create({
      user: userId,
      date,
      time,
      guests: guests || 1,
      status: "pending-payment", // 🔸 updated to match payment workflow
    });

    // ✅ Fetch user details
    const user = await User.findById(userId);

    // ✅ Send confirmation email (pending payment)
    if (user && user.email) {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      const mailOptions = {
        from: `"Fast Breakfast" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: "🍳 Booking Created - Awaiting Payment",
        html: `
          <div style="font-family:Arial, sans-serif; padding:20px; color:#333;">
            <h2>Hi ${user.name || "Guest"},</h2>
            <p>We've received your booking request. Please complete payment to confirm.</p>
            <table style="border-collapse:collapse; margin-top:10px;">
              <tr><td><b>Date:</b></td><td>${date}</td></tr>
              <tr><td><b>Time:</b></td><td>${time}</td></tr>
              <tr><td><b>Guests:</b></td><td>${guests || 1}</td></tr>
              <tr><td><b>Status:</b></td><td><span style="color:orange;">Pending Payment</span></td></tr>
            </table>
            <p style="margin-top:20px;">Once payment is successful, you’ll receive a confirmation email.</p>
            <p>Thank you for choosing <b>Fast Breakfast</b> 🥐</p>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
    }

    res.status(201).json({
      message: "Booking created successfully. Awaiting payment confirmation.",
      booking,
    });
  } catch (error) {
    console.error("❌ Error creating booking:", error);
    res.status(500).json({
      message: "Failed to create booking",
      error: error.message,
    });
  }
};

/**
 * 👤 Get logged-in user's bookings
 */
const getBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user._id }).populate(
      "user",
      "name email"
    );
    res.status(200).json(bookings);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch bookings", error: error.message });
  }
};

/**
 * 👨‍💼 Admin: Get all bookings
 */
const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find().populate("user", "name email");
    res.status(200).json(bookings);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch all bookings", error: error.message });
  }
};

/**
 * 🕒 Get availability for a specific date
 */
const getAvailability = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date)
      return res.status(400).json({ message: "Date query parameter required" });

    const availability = await Promise.all(
      SLOTS.map(async (slot) => {
        const count = await Booking.countDocuments({
          date,
          time: slot,
          status: { $in: ["booked", "pending-payment"] },
        });
        return {
          time: slot,
          remaining: Math.max(0, CAPACITY_PER_SLOT - count),
        };
      })
    );

    res.status(200).json({ date, slots: availability });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch availability",
      error: error.message,
    });
  }
};

/**
 * ❌ Cancel booking
 */
const cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findOne({ _id: id, user: req.user._id });

    if (!booking)
      return res.status(404).json({ message: "Booking not found" });

    booking.status = "cancelled";
    await booking.save();

    res
      .status(200)
      .json({ message: "Booking cancelled successfully", booking });
  } catch (error) {
    res.status(500).json({
      message: "Failed to cancel booking",
      error: error.message,
    });
  }
};

/**
 * ✅ Admin: Mark booking as completed
 */
const completeBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id);
    if (!booking)
      return res.status(404).json({ message: "Booking not found" });

    booking.status = "completed";
    await booking.save();

    res.status(200).json({ message: "Booking marked as completed", booking });
  } catch (error) {
    res.status(500).json({
      message: "Failed to complete booking",
      error: error.message,
    });
  }
};

/**
 * ✏️ Update booking
 */
const updateBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, time, guests } = req.body;

    const booking = await Booking.findOne({ _id: id, user: req.user._id });
    if (!booking)
      return res
        .status(404)
        .json({ message: "Booking not found or unauthorized" });

    if (booking.status !== "booked") {
      return res
        .status(400)
        .json({ message: "Only confirmed bookings can be updated." });
    }

    if (!SLOTS.includes(time)) {
      return res.status(400).json({ message: "Invalid time slot" });
    }

    booking.date = date || booking.date;
    booking.time = time || booking.time;
    booking.guests = guests || booking.guests;
    await booking.save();

    res.status(200).json({ message: "Booking updated successfully", booking });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update booking",
      error: error.message,
    });
  }
};

/**
 * 🗑️ Delete booking
 */
const deleteBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findOneAndDelete({
      _id: id,
      user: req.user._id,
    });

    if (!booking)
      return res
        .status(404)
        .json({ message: "Booking not found or unauthorized" });

    res.status(200).json({ message: "Booking deleted successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete booking",
      error: error.message,
    });
  }
};

module.exports = {
  createBooking,
  getBookings,
  getAllBookings,
  getAvailability,
  cancelBooking,
  completeBooking,
  updateBooking,
  deleteBooking,
};
