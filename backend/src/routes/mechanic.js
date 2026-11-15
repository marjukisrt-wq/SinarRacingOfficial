const express = require("express");
const Router = express.Router();
const mechanicController = require("../controllers/mechanic");
const authMiddleware = require("../middleware/auth");

Router.get("/recap/monthly", authMiddleware.verifyToken, mechanicController.getMonthlyRecap);
Router.get("/", authMiddleware.verifyToken, mechanicController.getAllMechanics);
Router.get("/:id", authMiddleware.verifyToken, mechanicController.getMechanicById);
Router.post("/", authMiddleware.verifyToken, mechanicController.createMechanic);
Router.put("/:id", authMiddleware.verifyToken, mechanicController.updateMechanic);
Router.delete("/:id", authMiddleware.verifyToken, mechanicController.deleteMechanic);

module.exports = Router;
