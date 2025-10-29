const MenuItem = require("../models/menuModel");

// 🥞 Get all menu items
const getMenu = async (req, res) => {
  try {
    const menu = await MenuItem.find();
    res.status(200).json(menu);
  } catch (error) {
    console.error("Error fetching menu:", error);
    res.status(500).json({ message: "Failed to fetch menu", error: error.message });
  }
};

// 🍳 Get single menu item by ID
const getMenuItemById = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await MenuItem.findById(id);
    if (!item) return res.status(404).json({ message: "Menu item not found" });
    res.status(200).json(item);
  } catch (error) {
    console.error("Error fetching menu item:", error);
    res.status(500).json({ message: "Failed to fetch menu item", error: error.message });
  }
};

// 🍔 Add a new menu item
const addMenuItem = async (req, res) => {
  try {
    const { name, description, price, image } = req.body;
    if (!name || !description || !price)
      return res.status(400).json({ message: "All fields are required" });

    const newItem = await MenuItem.create({ name, description, price, image });
    res.status(201).json({ message: "✅ Menu item added", item: newItem });
  } catch (error) {
    console.error("Error adding menu item:", error);
    res.status(500).json({ message: "Failed to add menu item", error: error.message });
  }
};

// 🧇 Update menu item
const updateMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, image, available } = req.body;

    const updatedItem = await MenuItem.findByIdAndUpdate(
      id,
      { name, description, price, image, available },
      { new: true }
    );

    if (!updatedItem)
      return res.status(404).json({ message: "Menu item not found" });

    res.status(200).json({ message: "✅ Menu item updated", item: updatedItem });
  } catch (error) {
    console.error("Error updating menu item:", error);
    res.status(500).json({ message: "Failed to update item", error: error.message });
  }
};

// 🍩 Delete menu item
const deleteMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedItem = await MenuItem.findByIdAndDelete(id);

    if (!deletedItem)
      return res.status(404).json({ message: "Menu item not found" });

    res.status(200).json({ message: "🗑️ Menu item deleted" });
  } catch (error) {
    console.error("Error deleting menu item:", error);
    res.status(500).json({ message: "Failed to delete item", error: error.message });
  }
};

module.exports = {
  getMenu,
  getMenuItemById,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
};
