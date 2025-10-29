const express = require("express");
const router = express.Router();
const {
  getMenu,
  getMenuItemById, // 👈 added
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
} = require("../controllers/menuControllers");
const { protect, authorize } = require("../middlewares/authMiddlewares");

// 📋 Public routes
router.get("/", getMenu);
router.get("/:id", getMenuItemById); // ✅ added this line

// 🛠 Admin-only routes
router.post("/", protect, authorize("admin"), addMenuItem);
router.put("/:id", protect, authorize("admin"), updateMenuItem);
router.delete("/:id", protect, authorize("admin"), deleteMenuItem);

module.exports = router;
