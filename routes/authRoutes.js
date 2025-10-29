const express = require("express");
const router = express.Router();
const {
  Register,
  Login,
  getMe,
  getUsers,
  updateUserRole,
  deleteUser,
} = require("../controllers/authControllers");
const { protect, authorize } = require("../middlewares/authMiddlewares");

// 🟢 Public Routes
router.post("/signup", Register);
router.post("/login", Login);

// 🔒 Protected Routes
router.get("/me", protect, getMe); // ✅ Get logged-in user profile
router.get("/profile", protect, (req, res) => {
  res.json({
    message: "Access granted to protected route",
    user: req.user,
  });
});

// 👑 Admin-Only Routes
router.get("/admin", protect, authorize("admin"), (req, res) => {
  res.json({
    message: "Welcome, Admin!",
    user: req.user,
  });
});

// 🧑‍💼 Admin User Management
router.get("/users", protect, authorize("admin"), getUsers);
router.put("/users/:id/role", protect, authorize("admin"), updateUserRole);
router.delete("/users/:id", protect, authorize("admin"), deleteUser);

module.exports = router;
