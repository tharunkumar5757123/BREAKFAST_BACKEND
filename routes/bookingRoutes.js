const express = require("express");
const router = express.Router();
const {
  createBooking,
  getBookings,
  getAllBookings,
  getAvailability,
  cancelBooking,
  completeBooking,
  updateBooking,deleteBooking
} = require("../controllers/bookingControllers");

const { protect, authorize } = require("../middlewares/authMiddlewares");

// 🔒 User routes
router.post("/", protect, createBooking);
router.get("/", protect, getBookings);
router.get("/availability", protect, getAvailability);
router.put("/cancel/:id", protect, cancelBooking);


// 📝 Update a booking (User only)
router.put("/update/:id", protect, updateBooking);

// 🗑️ Delete a booking (User only)
router.delete("/:id", protect, deleteBooking);


// 👨‍💼 Admin routes
router.get("/all", protect, authorize("admin"), getAllBookings);
router.put("/complete/:id", protect, authorize("admin"), completeBooking);

module.exports = router;
